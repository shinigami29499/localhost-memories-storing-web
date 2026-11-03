using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenamePlacesToLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_place_media_media_files_media_file_id",
                table: "place_media");

            migrationBuilder.DropForeignKey(
                name: "fk_place_media_places_place_id",
                table: "place_media");

            migrationBuilder.DropForeignKey(
                name: "fk_place_visits_places_place_id",
                table: "place_visits");

            migrationBuilder.DropForeignKey(
                name: "fk_place_visits_users_user_id",
                table: "place_visits");

            migrationBuilder.DropForeignKey(
                name: "fk_places_users_owner_id",
                table: "places");

            migrationBuilder.DropPrimaryKey(
                name: "pk_places",
                table: "places");

            migrationBuilder.DropPrimaryKey(
                name: "pk_place_visits",
                table: "place_visits");

            migrationBuilder.DropPrimaryKey(
                name: "pk_place_media",
                table: "place_media");

            migrationBuilder.RenameTable(
                name: "places",
                newName: "locations");

            migrationBuilder.RenameTable(
                name: "place_visits",
                newName: "location_visits");

            migrationBuilder.RenameTable(
                name: "place_media",
                newName: "location_media");

            migrationBuilder.RenameIndex(
                name: "ix_places_owner_id_created_at",
                table: "locations",
                newName: "ix_locations_owner_id_created_at");

            migrationBuilder.RenameIndex(
                name: "ix_places_created_at",
                table: "locations",
                newName: "ix_locations_created_at");

            migrationBuilder.RenameColumn(
                name: "place_id",
                table: "location_visits",
                newName: "location_id");

            migrationBuilder.RenameIndex(
                name: "ix_place_visits_user_id_created_at",
                table: "location_visits",
                newName: "ix_location_visits_user_id_created_at");

            migrationBuilder.RenameIndex(
                name: "ix_place_visits_place_id",
                table: "location_visits",
                newName: "ix_location_visits_place_id");

            migrationBuilder.RenameColumn(
                name: "place_id",
                table: "location_media",
                newName: "location_id");

            migrationBuilder.RenameIndex(
                name: "ix_place_media_place_id_position",
                table: "location_media",
                newName: "ix_location_media_location_id_position");

            migrationBuilder.RenameIndex(
                name: "ix_place_media_place_id_media_file_id",
                table: "location_media",
                newName: "ix_location_media_location_id_media_file_id");

            migrationBuilder.RenameIndex(
                name: "ix_place_media_media_file_id",
                table: "location_media",
                newName: "ix_location_media_media_file_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_locations",
                table: "locations",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_location_visits",
                table: "location_visits",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_location_media",
                table: "location_media",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_location_media_locations_place_id",
                table: "location_media",
                column: "location_id",
                principalTable: "locations",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_location_media_media_files_media_file_id",
                table: "location_media",
                column: "media_file_id",
                principalTable: "media_files",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_location_visits_locations_place_id",
                table: "location_visits",
                column: "location_id",
                principalTable: "locations",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_location_visits_users_user_id",
                table: "location_visits",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_locations_users_owner_id",
                table: "locations",
                column: "owner_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_location_media_locations_place_id",
                table: "location_media");

            migrationBuilder.DropForeignKey(
                name: "fk_location_media_media_files_media_file_id",
                table: "location_media");

            migrationBuilder.DropForeignKey(
                name: "fk_location_visits_locations_place_id",
                table: "location_visits");

            migrationBuilder.DropForeignKey(
                name: "fk_location_visits_users_user_id",
                table: "location_visits");

            migrationBuilder.DropForeignKey(
                name: "fk_locations_users_owner_id",
                table: "locations");

            migrationBuilder.DropPrimaryKey(
                name: "pk_locations",
                table: "locations");

            migrationBuilder.DropPrimaryKey(
                name: "pk_location_visits",
                table: "location_visits");

            migrationBuilder.DropPrimaryKey(
                name: "pk_location_media",
                table: "location_media");

            migrationBuilder.RenameTable(
                name: "locations",
                newName: "places");

            migrationBuilder.RenameTable(
                name: "location_visits",
                newName: "place_visits");

            migrationBuilder.RenameTable(
                name: "location_media",
                newName: "place_media");

            migrationBuilder.RenameIndex(
                name: "ix_locations_owner_id_created_at",
                table: "places",
                newName: "ix_places_owner_id_created_at");

            migrationBuilder.RenameIndex(
                name: "ix_locations_created_at",
                table: "places",
                newName: "ix_places_created_at");

            migrationBuilder.RenameColumn(
                name: "location_id",
                table: "place_visits",
                newName: "place_id");

            migrationBuilder.RenameIndex(
                name: "ix_location_visits_user_id_created_at",
                table: "place_visits",
                newName: "ix_place_visits_user_id_created_at");

            migrationBuilder.RenameIndex(
                name: "ix_location_visits_place_id",
                table: "place_visits",
                newName: "ix_place_visits_place_id");

            migrationBuilder.RenameColumn(
                name: "location_id",
                table: "place_media",
                newName: "place_id");

            migrationBuilder.RenameIndex(
                name: "ix_location_media_media_file_id",
                table: "place_media",
                newName: "ix_place_media_media_file_id");

            migrationBuilder.RenameIndex(
                name: "ix_location_media_location_id_position",
                table: "place_media",
                newName: "ix_place_media_place_id_position");

            migrationBuilder.RenameIndex(
                name: "ix_location_media_location_id_media_file_id",
                table: "place_media",
                newName: "ix_place_media_place_id_media_file_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_places",
                table: "places",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_place_visits",
                table: "place_visits",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_place_media",
                table: "place_media",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_place_media_media_files_media_file_id",
                table: "place_media",
                column: "media_file_id",
                principalTable: "media_files",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_place_media_places_place_id",
                table: "place_media",
                column: "place_id",
                principalTable: "places",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_place_visits_places_place_id",
                table: "place_visits",
                column: "place_id",
                principalTable: "places",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_place_visits_users_user_id",
                table: "place_visits",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_places_users_owner_id",
                table: "places",
                column: "owner_id",
                principalTable: "users",
                principalColumn: "id");
        }
    }
}
