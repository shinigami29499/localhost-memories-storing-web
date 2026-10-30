using System;
using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261030170000_AddFoodPlaceMedia")]
    public partial class AddFoodPlaceMedia : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "food_place_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    food_place_id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_food_place_media", x => x.id);
                    table.ForeignKey(
                        name: "fk_food_place_media_food_places_food_place_id",
                        column: x => x.food_place_id,
                        principalTable: "food_places",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_food_place_media_media_files_media_file_id",
                        column: x => x.media_file_id,
                        principalTable: "media_files",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_food_place_media_food_place_id_media_file_id",
                table: "food_place_media",
                columns: new[] { "food_place_id", "media_file_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_food_place_media_food_place_id_position",
                table: "food_place_media",
                columns: new[] { "food_place_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_food_place_media_media_file_id",
                table: "food_place_media",
                column: "media_file_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "food_place_media");
        }
    }
}
