using System;
using Infrastructures.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261029120000_AddCollections")]
    public partial class AddCollections : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "collections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_public = table.Column<bool>(type: "boolean", nullable: false),
                    preview_media_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_collections", x => x.id);
                    table.ForeignKey(
                        name: "fk_collections_media_files_preview_media_file_id",
                        column: x => x.preview_media_file_id,
                        principalTable: "media_files",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_collections_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "collection_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    collection_id = table.Column<Guid>(type: "uuid", nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_collection_posts", x => x.id);
                    table.ForeignKey(
                        name: "fk_collection_posts_collections_collection_id",
                        column: x => x.collection_id,
                        principalTable: "collections",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_collection_posts_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_collection_posts_collection_id_created_at",
                table: "collection_posts",
                columns: new[] { "collection_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_collection_posts_collection_id_post_id",
                table: "collection_posts",
                columns: new[] { "collection_id", "post_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_collection_posts_post_id",
                table: "collection_posts",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "ix_collections_is_public_created_at",
                table: "collections",
                columns: new[] { "is_public", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_collections_owner_id_created_at",
                table: "collections",
                columns: new[] { "owner_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_collections_preview_media_file_id",
                table: "collections",
                column: "preview_media_file_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "collection_posts");

            migrationBuilder.DropTable(
                name: "collections");
        }
    }
}
