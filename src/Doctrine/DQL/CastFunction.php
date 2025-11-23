<?php

namespace App\Doctrine\DQL;

use Doctrine\ORM\Query\AST\ASTException;
use Doctrine\ORM\Query\AST\Functions\FunctionNode;
use Doctrine\ORM\Query\AST\Node;
use Doctrine\ORM\Query\QueryException;
use Doctrine\ORM\Query\SqlWalker;
use Doctrine\ORM\Query\Parser;
use Doctrine\ORM\Query\TokenType;

class CastFunction extends FunctionNode
{
    public Node $fieldExpression;
    public string $castType;

    /**
     * @throws QueryException
     */
    public function parse(Parser $parser): void
    {
        $parser->match(TokenType::T_IDENTIFIER);
        $parser->match(TokenType::T_OPEN_PARENTHESIS);

        $this->fieldExpression = $parser->ArithmeticPrimary();

        $parser->match(TokenType::T_AS);
        $parser->match(TokenType::T_IDENTIFIER);

        $lexer = $parser->getLexer();
        $this->castType = $lexer->token->value;

        $parser->match(TokenType::T_CLOSE_PARENTHESIS);
    }

    /**
     * @throws ASTException
     */
    public function getSql(SqlWalker $sqlWalker): string
    {
        return 'CAST(' . $this->fieldExpression->dispatch($sqlWalker) . ' AS ' . $this->castType . ')';
    }
}
