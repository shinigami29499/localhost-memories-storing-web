using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261101120000_AddPlaceVisitRatingAndNote")]
public partial class AddPlaceVisitRatingAndNote : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "note", table: "place_visits", type: "character varying(2000)", maxLength: 2000,
            nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<int>(
            name: "rating", table: "place_visits", type: "integer", nullable: false, defaultValue: 0);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "note", table: "place_visits");
        migrationBuilder.DropColumn(name: "rating", table: "place_visits");
    }
}
