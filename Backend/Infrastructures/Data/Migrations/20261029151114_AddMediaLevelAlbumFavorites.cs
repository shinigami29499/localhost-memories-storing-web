using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructures.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaLevelAlbumFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "collection_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    collection_id = table.Column<Guid>(type: "uuid", nullable: false),
                    media_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_collection_media", x => x.id);
                    table.ForeignKey(
                        name: "fk_collection_media_collections_collection_id",
                        column: x => x.collection_id,
                        principalTable: "collections",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_collection_media_media_files_media_file_id",
                        column: x => x.media_file_id,
                        principalTable: "media_files",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "media_favorites",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    media_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media_favorites", x => x.id);
                    table.ForeignKey(
                        name: "fk_media_favorites_media_files_media_file_id",
                        column: x => x.media_file_id,
                        principalTable: "media_files",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_media_favorites_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_collection_media_collection_id_created_at",
                table: "collection_media",
                columns: new[] { "collection_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_collection_media_collection_id_media_file_id",
                table: "collection_media",
                columns: new[] { "collection_id", "media_file_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_collection_media_media_file_id",
                table: "collection_media",
                column: "media_file_id");

            migrationBuilder.CreateIndex(
                name: "ix_media_favorites_media_file_id_user_id",
                table: "media_favorites",
                columns: new[] { "media_file_id", "user_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_media_favorites_user_id_created_at",
                table: "media_favorites",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.Sql("""
                INSERT INTO collection_media
                    (id, collection_id, media_file_id, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
                SELECT gen_random_uuid(), saved.collection_id, media.id,
                    saved.created_by, saved.created_at, saved.updated_by, saved.updated_at, saved.deleted_by, saved.deleted_at
                FROM collection_posts AS saved
                JOIN collections AS collection ON collection.id = saved.collection_id
                JOIN posts AS post ON post.id = saved.post_id
                JOIN media_files AS media ON media.post_id = post.id
                WHERE saved.deleted_at IS NULL
                    AND collection.deleted_at IS NULL
                    AND post.deleted_at IS NULL
                    AND media.deleted_at IS NULL
                ON CONFLICT (collection_id, media_file_id) WHERE deleted_at IS NULL DO NOTHING;

                INSERT INTO media_favorites
                    (id, media_file_id, user_id, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
                SELECT gen_random_uuid(), media.id, reaction.user_id,
                    reaction.created_by, reaction.created_at, reaction.updated_by, reaction.updated_at,
                    reaction.deleted_by, reaction.deleted_at
                FROM reactions AS reaction
                JOIN posts AS post ON post.id = reaction.post_id
                JOIN media_files AS media ON media.post_id = post.id
                JOIN users AS user_account ON user_account.id = reaction.user_id
                WHERE reaction.reaction_type = 'heart'
                    AND reaction.deleted_at IS NULL
                    AND post.deleted_at IS NULL
                    AND media.deleted_at IS NULL
                    AND user_account.deleted_at IS NULL
                ON CONFLICT (media_file_id, user_id) WHERE deleted_at IS NULL DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Legacy tables store these relationships per post, so downgrade preserves each represented post/user.
            migrationBuilder.Sql("""
                INSERT INTO collection_posts
                    (id, collection_id, post_id, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
                SELECT DISTINCT ON (saved.collection_id, media.post_id)
                    gen_random_uuid(), saved.collection_id, media.post_id,
                    saved.created_by, saved.created_at, saved.updated_by, saved.updated_at,
                    saved.deleted_by, saved.deleted_at
                FROM collection_media AS saved
                JOIN collections AS collection ON collection.id = saved.collection_id
                JOIN media_files AS media ON media.id = saved.media_file_id
                JOIN posts AS post ON post.id = media.post_id
                WHERE saved.deleted_at IS NULL
                    AND collection.deleted_at IS NULL
                    AND media.deleted_at IS NULL
                    AND post.deleted_at IS NULL
                ORDER BY saved.collection_id, media.post_id, saved.created_at, saved.id
                ON CONFLICT (collection_id, post_id) WHERE deleted_at IS NULL DO NOTHING;

                INSERT INTO reactions
                    (id, post_id, user_id, reaction_type, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
                SELECT DISTINCT ON (media.post_id, favorite.user_id)
                    gen_random_uuid(), media.post_id, favorite.user_id, 'heart',
                    favorite.created_by, favorite.created_at, favorite.updated_by, favorite.updated_at,
                    favorite.deleted_by, favorite.deleted_at
                FROM media_favorites AS favorite
                JOIN media_files AS media ON media.id = favorite.media_file_id
                JOIN posts AS post ON post.id = media.post_id
                JOIN users AS user_account ON user_account.id = favorite.user_id
                WHERE favorite.deleted_at IS NULL
                    AND media.deleted_at IS NULL
                    AND post.deleted_at IS NULL
                    AND user_account.deleted_at IS NULL
                ORDER BY media.post_id, favorite.user_id, favorite.created_at, favorite.id
                ON CONFLICT (post_id, user_id, reaction_type) WHERE deleted_at IS NULL DO NOTHING;
                """);

            migrationBuilder.DropTable(
                name: "collection_media");

            migrationBuilder.DropTable(
                name: "media_favorites");
        }
    }
}
