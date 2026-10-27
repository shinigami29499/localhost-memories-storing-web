using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUploadTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "upload_batches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_upload_batches", batch => batch.id);
                    table.ForeignKey(
                        name: "fk_upload_batches_users_owner_id",
                        column: batch => batch.owner_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "upload_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    upload_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_filename = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    progress_percent = table.Column<int>(type: "integer", nullable: false),
                    error_details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    retry_count = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    stored_filename = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    relative_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    mime_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    file_extension = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    media_kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_upload_items", item => item.id);
                    table.ForeignKey(
                        name: "fk_upload_items_upload_batches_upload_batch_id",
                        column: item => item.upload_batch_id,
                        principalTable: "upload_batches",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_upload_batches_owner_id_created_at",
                table: "upload_batches",
                columns: new[] { "owner_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_upload_items_one_uploading_per_batch",
                table: "upload_items",
                column: "upload_batch_id",
                unique: true,
                filter: "status = 'Uploading' AND deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "upload_items");
            migrationBuilder.DropTable(name: "upload_batches");
        }
    }
}
