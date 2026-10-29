using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemovePostFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_media_files_posts_post_id",
                table: "media_files");

            migrationBuilder.DropForeignKey(
                name: "fk_upload_batches_posts_post_id",
                table: "upload_batches");

            migrationBuilder.DropTable(
                name: "collection_posts");

            migrationBuilder.DropTable(
                name: "comments");

            migrationBuilder.DropTable(
                name: "post_upload_notifications");

            migrationBuilder.DropTable(
                name: "reactions");

            migrationBuilder.DropIndex(
                name: "ix_upload_batches_post_id",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "caption",
                table: "upload_batches");

            migrationBuilder.DropColumn(
                name: "post_id",
                table: "upload_batches");

            migrationBuilder.RenameColumn(
                name: "post_id",
                table: "media_files",
                newName: "owner_id");

            migrationBuilder.RenameIndex(
                name: "ix_media_files_post_id",
                table: "media_files",
                newName: "ix_media_files_owner_id");

            migrationBuilder.Sql("""
                UPDATE media_files AS media
                SET owner_id = post.user_id
                FROM posts AS post
                WHERE media.owner_id = post.id;
                """);

            migrationBuilder.DropTable(
                name: "posts");

            migrationBuilder.AddForeignKey(
                name: "fk_media_files_users_owner_id",
                table: "media_files",
                column: "owner_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_media_files_users_owner_id",
                table: "media_files");

            migrationBuilder.RenameColumn(
                name: "owner_id",
                table: "media_files",
                newName: "post_id");

            migrationBuilder.RenameIndex(
                name: "ix_media_files_owner_id",
                table: "media_files",
                newName: "ix_media_files_post_id");

            migrationBuilder.AddColumn<string>(
                name: "caption",
                table: "upload_batches",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "post_id",
                table: "upload_batches",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "post_upload_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notification_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "PostUploaded"),
                    post_caption = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    recipient_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_post_upload_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    caption = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_posts", x => x.id);
                    table.ForeignKey(
                        name: "fk_posts_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.Sql("""
                INSERT INTO posts (id, user_id, caption, created_by, created_at)
                SELECT DISTINCT owner_id, owner_id, '', owner_id, NOW()
                FROM media_files;
                """);

            migrationBuilder.CreateTable(
                name: "collection_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    collection_id = table.Column<Guid>(type: "uuid", nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
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

            migrationBuilder.CreateTable(
                name: "comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_comments", x => x.id);
                    table.ForeignKey(
                        name: "fk_comments_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_comments_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "reactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    reaction_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reactions", x => x.id);
                    table.ForeignKey(
                        name: "fk_reactions_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_reactions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_upload_batches_post_id",
                table: "upload_batches",
                column: "post_id",
                unique: true);

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
                name: "ix_comments_post_id_created_at",
                table: "comments",
                columns: new[] { "post_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_comments_user_id",
                table: "comments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_post_upload_notifications_recipient_id_created_at",
                table: "post_upload_notifications",
                columns: new[] { "recipient_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_post_upload_notifications_recipient_id_read_at",
                table: "post_upload_notifications",
                columns: new[] { "recipient_id", "read_at" });

            migrationBuilder.CreateIndex(
                name: "ix_posts_deleted_at_created_at",
                table: "posts",
                columns: new[] { "deleted_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_posts_user_id",
                table: "posts",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_reactions_deleted_at_created_at",
                table: "reactions",
                columns: new[] { "deleted_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_reactions_post_id_user_id_reaction_type",
                table: "reactions",
                columns: new[] { "post_id", "user_id", "reaction_type" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_reactions_user_id",
                table: "reactions",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_media_files_posts_post_id",
                table: "media_files",
                column: "post_id",
                principalTable: "posts",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_upload_batches_posts_post_id",
                table: "upload_batches",
                column: "post_id",
                principalTable: "posts",
                principalColumn: "id");
        }
    }
}
