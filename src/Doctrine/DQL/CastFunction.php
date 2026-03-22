<?php

namespace App\Doctrine\DQL;

use Doctrine\ORM\Query\AST\ASTException;
use Doctrine\ORM\Query\AST\Functions\FunctionNode;
use Doctrine\ORM\Query\AST\Node;
use Doctrine\ORM\Query\QueryException;
use Doctrine\ORM\Query\SqlWalker;
use Doctrine\ORM\Query\Parser;
use Doctrine\ORM\Query\TokenType;

/**
 * Кастомная DQL-функция CAST(expr AS type).
 *
 * Проблема:
 *   Doctrine ORM не знает SQL-функцию CAST() из коробки.
 *   Попытка написать в DQL «CAST(u.roles AS text)» вызовет ошибку парсинга.
 *
 * Решение:
 *   Регистрируем собственный FunctionNode, который транслирует DQL-вызов
 *   CAST(expr AS type) в нативный SQL CAST(expr AS type) без изменений.
 *
 * Регистрация (doctrine.yaml или аналог):
 *   orm:
 *       dql:
 *           string_functions:
 *               CAST: App\Doctrine\DQL\CastFunction
 *
 * Использование в репозиториях:
 *   ->andWhere("CAST(u.roles AS text) LIKE :role")
 *
 * Зачем нужен CAST в наших запросах?
 *   Поле User::$roles хранится в БД как JSON (массив строк).
 *   PostgreSQL не позволяет применять LIKE напрямую к JSON-колонке —
 *   необходимо привести её к text: CAST(roles AS text) LIKE '%ROLE_MASTER%'.
 */
class CastFunction extends FunctionNode
{
    // Выражение первого аргумента (поле или подвыражение)
    public Node $fieldExpression;

    // Целевой SQL-тип, переданный после AS (например: text, integer, uuid)
    public string $castType;

    /**
     * Парсит DQL-вызов: CAST( <expr> AS <type> )
     *
     * Последовательность токенов, которую ожидает парсер:
     *   T_IDENTIFIER   — имя функции «CAST» (уже сопоставлено диспетчером)
     *   T_OPEN_PARENTHESIS  — «("
     *   ArithmeticPrimary   — любое арифметическое выражение / поле
     *   T_AS                — ключевое слово «AS»
     *   T_IDENTIFIER        — имя типа (text, integer, …)
     *   T_CLOSE_PARENTHESIS — «)"
     *
     * @throws QueryException
     */
    public function parse(Parser $parser): void
    {
        $parser->match(TokenType::T_IDENTIFIER);    // «CAST»
        $parser->match(TokenType::T_OPEN_PARENTHESIS); // «("

        $this->fieldExpression = $parser->ArithmeticPrimary(); // поле/выражение

        $parser->match(TokenType::T_AS);              // «AS»
        $parser->match(TokenType::T_IDENTIFIER);      // тип — сопоставляем токен,
                                                      // но читаем значение через Lexer ниже

        // getLexer()->token содержит последний сопоставлённый токен —
        // именно его значение и является целевым типом (например «text»)
        $lexer = $parser->getLexer();
        $this->castType = $lexer->token->value;

        $parser->match(TokenType::T_CLOSE_PARENTHESIS); // «)"
    }

    /**
     * Генерирует итоговый SQL-фрагмент.
     * dispatch() рекурсивно транслирует вложенное DQL-выражение в SQL.
     *
     * @throws ASTException
     */
    public function getSql(SqlWalker $sqlWalker): string
    {
        return 'CAST(' . $this->fieldExpression->dispatch($sqlWalker) . ' AS ' . $this->castType . ')';
    }
}
