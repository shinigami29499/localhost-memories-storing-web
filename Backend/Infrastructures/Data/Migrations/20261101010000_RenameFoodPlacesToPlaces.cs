using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261101010000_RenameFoodPlacesToPlaces")]
public partial class RenameFoodPlacesToPlaces : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameTable(name: "food_places", newName: "places");
        migrationBuilder.RenameTable(name: "food_place_media", newName: "place_media");
        migrationBuilder.RenameTable(name: "food_place_visits", newName: "place_visits");
        migrationBuilder.RenameColumn(name: "food_place_id", table: "place_media", newName: "place_id");
        migrationBuilder.RenameColumn(name: "food_place_id", table: "place_visits", newName: "place_id");
        RenameObjects(migrationBuilder, "food_place", "place", "places", "place_media", "place_visits");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        RenameObjects(migrationBuilder, "place", "food_place", "places", "place_media", "place_visits");
        migrationBuilder.RenameColumn(name: "place_id", table: "place_media", newName: "food_place_id");
        migrationBuilder.RenameColumn(name: "place_id", table: "place_visits", newName: "food_place_id");
        migrationBuilder.RenameTable(name: "place_visits", newName: "food_place_visits");
        migrationBuilder.RenameTable(name: "place_media", newName: "food_place_media");
        migrationBuilder.RenameTable(name: "places", newName: "food_places");
    }

    private static void RenameObjects(MigrationBuilder migrationBuilder, string from, string to, string first, string second, string third)
    {
        migrationBuilder.Sql($"""
            DO $$
            DECLARE item record;
            BEGIN
                FOR item IN SELECT c.conname, t.relname FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    WHERE n.nspname = current_schema() AND t.relname IN ('{first}', '{second}', '{third}') AND c.conname LIKE '%{from}%'
                LOOP
                    EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', item.relname, item.conname, replace(item.conname, '{from}', '{to}'));
                END LOOP;
                FOR item IN SELECT indexname FROM pg_indexes
                    WHERE schemaname = current_schema() AND tablename IN ('{first}', '{second}', '{third}') AND indexname LIKE '%{from}%'
                LOOP
                    EXECUTE format('ALTER INDEX %I RENAME TO %I', item.indexname, replace(item.indexname, '{from}', '{to}'));
                END LOOP;
            END $$;
            """);
    }
}
