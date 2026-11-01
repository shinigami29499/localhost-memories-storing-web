using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedHomeLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shared_home_locations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shared_home_locations", x => x.id);
                    table.CheckConstraint("ck_shared_home_location_singleton", "id = 1");
                });

            migrationBuilder.InsertData(
                table: "shared_home_locations",
                columns: new[] { "id", "latitude", "longitude" },
                values: new object[] { 1, null, null });

            migrationBuilder.Sql("""
                UPDATE shared_home_locations
                SET latitude = source.home_latitude, longitude = source.home_longitude
                FROM (SELECT home_latitude, home_longitude FROM users
                      WHERE deleted_at IS NULL AND home_latitude IS NOT NULL AND home_longitude IS NOT NULL
                      ORDER BY created_at, id LIMIT 1) AS source
                WHERE shared_home_locations.id = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "shared_home_locations");
        }
    }
}
