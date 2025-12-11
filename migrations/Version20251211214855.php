<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251211214855 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // First, update existing NULL values
        $this->addSql('UPDATE "user" SET active = false WHERE active IS NULL');

        // Then modify the column to NOT NULL
        $this->addSql('ALTER TABLE "user" ALTER COLUMN active SET NOT NULL');
        $this->addSql('ALTER TABLE "user" ALTER COLUMN active SET DEFAULT false');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ALTER COLUMN active DROP NOT NULL');
        $this->addSql('ALTER TABLE "user" ALTER COLUMN active DROP DEFAULT');
    }
}
