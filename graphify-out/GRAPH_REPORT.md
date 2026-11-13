# Graph Report - ShinigaCim  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4428 nodes · 13804 edges · 182 communities (110 shown, 72 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 976 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `077fc2a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 149
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 161
- Community 162

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 166 edges
2. `react` - 142 edges
3. `IconWrapper()` - 124 edges
4. `useAnimateIconContext()` - 120 edges
5. `motion` - 75 edges
6. `useAuthStore` - 68 edges
7. `vitest` - 64 edges
8. `AnimateIcon()` - 63 edges
9. `Button()` - 60 edges
10. `MediaFile` - 58 edges

## Surprising Connections (you probably didn't know these)
- `MediaFiles` --references--> `MediaFile`  [EXTRACTED]
  Backend/Infrastructures/Data/ApplicationDbContext.cs → Backend/Domains/Entities/MediaFile.cs
- `Props` --references--> `MediaFile`  [EXTRACTED]
  Frontend/src/features/media/components/MediaCard.tsx → Frontend/src/features/media/types.ts
- `CommonProps` --references--> `MediaFile`  [EXTRACTED]
  Frontend/src/features/media/components/MediaPreviewDialog.tsx → Frontend/src/features/media/types.ts
- `SlideProps` --references--> `MediaFile`  [EXTRACTED]
  Frontend/src/features/media/components/MediaPreviewDialog.tsx → Frontend/src/features/media/types.ts
- `Props` --references--> `MediaFile`  [EXTRACTED]
  Frontend/src/features/media/components/MediaTile.tsx → Frontend/src/features/media/types.ts

## Import Cycles
- 2-file cycle: `Frontend/src/components/common/ActivityHeatmap.tsx -> Frontend/src/features/uploads/components/UploadActivityHeatmap.tsx -> Frontend/src/components/common/ActivityHeatmap.tsx`
- 2-file cycle: `Frontend/src/features/navigation/components/MapNavigation.tsx -> Frontend/src/features/navigation/components/NavigationOptions.tsx -> Frontend/src/features/navigation/components/MapNavigation.tsx`
- 2-file cycle: `Frontend/src/features/uploads/services/uploadRuntime.ts -> Frontend/src/features/uploads/services/uploadService.ts -> Frontend/src/features/uploads/services/uploadRuntime.ts`

## Communities (182 total, 72 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (192): animations, ArrowRightProps, IconComponent(), animations, BanProps, IconComponent(), animations, BellProps (+184 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (18): AuthController, CollectionsController, MediaFavoritesController, PlacesController, UpdatePlaceVisitRequest, PreviewsController, UploadsController, UsersController (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (22): AuthService, MediaService, PreviewService, UploadService, UserService, AuthRepository, IAuthRepository, IUnitOfWork (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (80): ExternalLink(), NotebookPen(), Plus(), animations, IconComponent(), Trash2(), Trash2Props, UploadLift() (+72 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (16): TestDiagnosticsContracts, TestPersistence, TestReasoningMatch, TestTokenizer, TestMetricMath, read_rows(), read_rows(), TestTextLayoutDataContracts (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (67): AlbumPage, AlbumsPage, App(), AuthenticatedLayout, ErrorPage, GalleryLayout, GalleryPage, HomePage (+59 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (71): animations, Bookmark(), BookmarkProps, IconComponent(), LoaderCircle(), ActivityDialog(), Props, Button() (+63 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (15): PlaceService, PlaceValues, PlaceRepository, IPlaceRepository, IPlaceService, PlaceDto, PlaceMapBounds, PlaceMapDto (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (5): UploadRepository, IUploadRepository, MediaChange, MediaChangesResponse, PagedUploadBatchesResponse

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (61): Compass(), Copy(), animations, Eye(), EyeProps, IconComponent(), animations, Heart() (+53 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (41): main(), AnthropicSdkUnavailable, backup_dir_for(), _body_candidate_error(), build_compress_prompt(), build_fix_prompt(), call_anthropic_sdk(), call_claude() (+33 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (8): UserDirectoryController, CollectionRepository, UserRepository, ICollectionRepository, CollectionSource, UserMentionCandidateDto, MarkUploadBatchesViewedRequest, UserPageResponse

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (67): Search(), Star(), usePageActionBarFooter(), inDateRange(), NavigationHighlight(), PageHighlightBar(), Spinner(), SwapLabel() (+59 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (39): main(), AnthropicSdkUnavailable, backup_dir_for(), _body_candidate_error(), build_compress_prompt(), build_fix_prompt(), call_anthropic_sdk(), call_claude() (+31 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (45): Ban(), Bot(), UserAvatar(), UserAvatarProps, endReplacedSession(), sessionReplacedEvent, AccountStatus, AuthSession (+37 more)

### Community 15 - "Community 15"
Cohesion: 0.04
Nodes (22): MediaFile, FileExtension, FileSizeBytes, IsPreviewOnly, MediaKind, Metadata, MimeType, OriginalFilename (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (53): Pause(), Play(), locateUploadedBatch(), Props, timeLabel(), VideoPlayer(), UploadNotification, UploadNotificationState (+45 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (15): CollectionService, IPreviewLifecycle, ValidationException, Errors, ICollectionService, CollectionDto, PreviewIsFavorited, CollectionListRequest (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (11): MediaController, IMediaService, IPreviewService, MediaFileContent, MediaFileDto, DeletedAt, MediaPageRequest, Limit (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (42): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary() (+34 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (38): SettingsPage, CalendarCheck(), ShieldCheck(), addDays(), addMonths(), DatePicker(), DatePickerProps, isSameDay() (+30 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (40): Props, destination, map, route, GoogleMapsLink(), isReliableFix(), LocationFix, toFix() (+32 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (25): ansi_ljust(), _button_outline_text_color(), _contrast_ratio(), _derive_dark_palette(), _detect_page_type(), format_ascii_box(), add_wrapped(), wrap_text() (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (40): mask_code_blocks(), _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract() (+32 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (24): ansi_ljust(), _button_outline_text_color(), _contrast_ratio(), _derive_dark_palette(), _detect_page_type(), format_ascii_box(), add_wrapped(), wrap_text() (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.04
Nodes (5): media, scenarios, MotionRecord, MotionWindow, @playwright/test

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (14): IMediaStorageService, CityLookup, CityLookupOptions, BaseUrl, TimeoutSeconds, Apis.Middleware, Infrastructures.Adapters.Exceptions, Apis.Core (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (13): PresenceNotifications, UploadNotifications, UploadLimits, Services.Interfaces, Services.Core, Services.Responses.Auth, Apis.Interfaces, Services.Requests.Auth (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (16): LogoutRequest, RefreshTokenRequest, RegisterRequest, AddCollectionMediaRequest, CollectionPageRequest, Cursor, Limit, Search (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (11): MediaHomeLocation, SessionReplacedException, SetMediaLocationRequest, OwnedMediaCountsResponse, Services.Requests.Media, Infrastructures.Data.ApplicationServices, Services.Exceptions, Services.Responses.Media (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (9): InvalidMediaFileException, MediaStorageService, MediaStorageOptions, FFmpegPath, ImageExtensions, MaxFileMegabytes, Root, VideoExtensions (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (6): TestAntiPatternGating, TestEndToEndCoherence, TestLightResultOutputCoherence, TestLuminance, TestModeResolution, TestPaletteSelection

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (9): DataSeeder, MediaKinds, ServiceCollectionExtensions, Domains.Entities, Infrastructures.Adapters.Storage, Infrastructures.Data.Interfaces, Infrastructures.Data.Implementations, Infrastructures.Data.DependencyInjection (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (7): read_rows(), split_values(), style_identities(), TestGeneratedCatalogContract, TestLandingAndStackContract, TestReasoningContract, TestStyleIdentityContract

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (7): read_rows(), split_values(), style_identities(), TestGeneratedCatalogContract, TestLandingAndStackContract, TestReasoningContract, TestStyleIdentityContract

### Community 37 - "Community 37"
Cohesion: 0.08
Nodes (30): config, devDependencies, @capacitor/cli@^8.6.0, jsdom@^30.1.3, @playwright/test@^1.64.1, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3, @types/node@^26.6.6 (+22 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (20): animations, CheckProps, IconComponent(), Check(), Clapperboard(), PencilLine(), GalleryTileContent(), Props (+12 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (7): AddColumnDefaults, AddUploadTracking, LinkUploadBatchesToPosts, RemovePostFeatures, AddDownloadRecords, AddDownloadBatchState, ApplicationDbContextModelSnapshot

### Community 40 - "Community 40"
Cohesion: 0.06
Nodes (5): TestAntiPatternGating, TestLightResultOutputCoherence, TestLuminance, TestModeResolution, TestPaletteSelection

### Community 41 - "Community 41"
Cohesion: 0.06
Nodes (31): dependencies, @animate-ui/react@^2.4.1, @base-ui/react@^1.9.0, @capacitor/android@^8.6.0, @capacitor/app@^8.0.0, @capacitor/core@^8.6.0, embla-carousel@^8.6.0, embla-carousel-react@^8.6.0 (+23 more)

### Community 42 - "Community 42"
Cohesion: 0.07
Nodes (29): agents, developer, input, output, tools, compaction, auto, default_agent (+21 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (6): RemapAccountStatusValues, AddNotificationTypes, RenameFoodPlacesToPlaces, AddUserLastSeenAt, AddPlaceVisitRatingAndNote, AddUploadDownloadViewedAt

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (17): count_bullets(), extract_code_blocks(), extract_fenced_spans(), extract_headings(), extract_indented_code_blocks(), extract_inline_codes(), extract_paths(), extract_urls() (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.08
Nodes (12): CreateUploadBatchRequest, CreateUploadItemRequest, FailUploadItemRequest, UploadListRequest, CreatedBefore, CreatedFrom, Limit, Offset (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (15): ActivityHeatmap(), Props, image, media, render(), state, loadRecentBatches(), UploadActivityHeatmap() (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (14): ActivePush, activePushes, capture(), HighlightPosition, highlightPosition(), makeClip(), pageContent(), PageSnapshot (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (3): DesignSystemGenerator, _filter_anti_patterns_for_mode(), _resolve_dial()

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (19): User, AvatarSeed, HomeLatitude, HomeLongitude, LastSeenAt, Password, Role, SessionId (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (3): DesignSystemGenerator, _filter_anti_patterns_for_mode(), _resolve_dial()

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (16): HomeLocationMarker(), Props, mocks, HomeLocationPhotoConfirmation(), Props, homeLocationKeys, Harness(), location (+8 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (21): Camera(), Props, InitialLocationCenter(), MapCameraScene(), MapContent(), MapResizer(), MapScene, MapViewport() (+13 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (22): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+14 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (14): count_bullets(), extract_code_blocks(), extract_headings(), extract_inline_codes(), extract_paths(), extract_urls(), read_file(), validate() (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.15
Nodes (5): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (5): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (6): AddPostUploadNotifications, AddCollections, AddFoodPlaces, AddFoodPlaceMedia, Infrastructures.Data, Apis

### Community 58 - "Community 58"
Cohesion: 0.17
Nodes (18): Moon(), Sun(), Sunrise(), Sunset(), colorProperties, colorThemeOptions, customThemes, getMapAppearanceConfig() (+10 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (5): PlaceMappings, Services.Responses.Place, Services.Mappings, Services.Models.Place, Services.Requests.Place

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (17): Globe(), Key(), SlidersHorizontal(), MapDraftMarker(), MapLoadingOverlay(), useHomeMarkerHover(), MapNavigation(), NavigationFallback() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (18): UploadItem, Batch, CompletedAt, ContentType, ErrorDetails, FileExtension, FileSizeBytes, MediaKind (+10 more)

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (14): Place, Address, City, Latitude, Longitude, MarkerColor, MarkerIcon, MediaItems (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (16): UploadBatch, CompletedAt, Items, Owner, OwnerId, StartedAt, Status, ViewedAt (+8 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (9): ServiceCollectionExtensions, TokenService, ITokenService, JwtOptions, AccessTokenMinutes, Audience, Issuer, Key (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.22
Nodes (15): Apis, net8.0, System.IdentityModel.Tokens.Jwt (8.3.0), Domains, Microsoft.NET.Sdk, Infrastructures, Services, System.IdentityModel.Tokens.Jwt (8.3.0) (+7 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (3): DesignTimeDbContextFactory, ApplicationDbContext, MediaFiles

### Community 73 - "Community 73"
Cohesion: 0.15
Nodes (4): resolve(), shipped_invocations(), SkillScriptPathsTest, TestThresholdGate

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (6): CurrentUserContext, IsAdmin, Principal, UserId, Username, IAuditActorProvider

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (11): DownloadBatchState, ItemsJson, User, UserId, ViewedAt, SharedHomeLocation, Id, Latitude (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.18
Nodes (4): InitialCreate, AllowUsernameReuseAfterSoftDelete, AddPlaceCity, Infrastructures.Data.Migrations

### Community 79 - "Community 79"
Cohesion: 0.21
Nodes (10): PhotoMarkers(), map, PlaceClusterMarker(), PlaceMarkers(), clusterMapMarkers(), isMarkerInViewport(), MapCoordinate, MapMarkerGroup (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.31
Nodes (9): LocationSearch(), Props, place, useLocationSearch(), isRecord(), LocationSearchResult, parseResult(), searchLocations() (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.17
Nodes (10): Collection, Caption, IsPublic, MediaItems, Name, Owner, OwnerId, PreviewMediaFile (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.19
Nodes (3): AddMediaLevelAlbumFavorites, AddFoodPlaceVisits, RepairPreviewDraftExpiryColumn

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (3): read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 89 - "Community 89"
Cohesion: 0.17
Nodes (10): AuditableEntity, CreatedAt, CreatedBy, DeletedAt, DeletedBy, IsDeleted, UpdatedAt, UpdatedBy (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.17
Nodes (10): RefreshToken, ExpiresAt, RevokedAt, RevokedBy, RevokedReason, SessionId, TokenHash, User (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (3): DataTransaction, UnitOfWork, IDataTransaction

### Community 93 - "Community 93"
Cohesion: 0.20
Nodes (8): PlaceVisit, Note, Place, PlaceId, Rating, User, UserId, PlaceVisits

### Community 94 - "Community 94"
Cohesion: 0.22
Nodes (9): clsx@^2.1.1, tailwind-merge@^3.7.0, Tooltip(), TooltipContent(), TooltipProvider(), TooltipTrigger(), cn(), clsx (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.33
Nodes (7): addToast(), normalizeToastMessage(), SoundEffectsSettings(), playUiSound(), readEnabled(), useSoundPreferencesStore, react-sounds

### Community 97 - "Community 97"
Cohesion: 0.20
Nodes (9): ASPNETCORE_ENVIRONMENT, applicationUrl, commandName, dotnetRunMessages, environmentVariables, launchBrowser, profiles, http (+1 more)

### Community 98 - "Community 98"
Cohesion: 0.22
Nodes (7): PlaceMedia, MediaFile, MediaFileId, Place, PlaceId, Position, PlaceMedia

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (3): CollectionMappings, UserSummaryDto, Services.Models.Users

### Community 100 - "Community 100"
Cohesion: 0.25
Nodes (6): CollectionMedia, Collection, CollectionId, MediaFile, MediaFileId, CollectionMedia

### Community 101 - "Community 101"
Cohesion: 0.25
Nodes (6): MediaFavorite, MediaFile, MediaFileId, User, UserId, MediaFavorites

### Community 102 - "Community 102"
Cohesion: 0.25
Nodes (7): DownloadRecord, BatchId, MediaId, OriginalFilename, User, UserId, DownloadRecords

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (7): UploadItemStatus, Cancelled, Failed, Paused, Pending, Success, Uploading

### Community 104 - "Community 104"
Cohesion: 0.32
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 105 - "Community 105"
Cohesion: 0.25
Nodes (5): LocationMap(), coordinate, photo, place, viewport

### Community 106 - "Community 106"
Cohesion: 0.32
Nodes (5): BasemapKind, findPlaceAt(), PlaceFeature, hospital, react-map-gl

### Community 107 - "Community 107"
Cohesion: 0.43
Nodes (4): benchmark_pair(), count_tokens(), main(), print_table()

### Community 111 - "Community 111"
Cohesion: 0.43
Nodes (4): benchmark_pair(), count_tokens(), main(), print_table()

### Community 112 - "Community 112"
Cohesion: 0.38
Nodes (3): resolve(), shipped_invocations(), SkillScriptPathsTest

### Community 113 - "Community 113"
Cohesion: 0.29
Nodes (7): scripts, android:sync, build, dev, preview, test, test:e2e

### Community 115 - "Community 115"
Cohesion: 0.38
Nodes (6): CLICK_ANIMATION_EFFECTS, ClickAnimationEffect, ClickAnimationState, isClickAnimationEffect(), readClickAnimationEffect(), useClickAnimationStore

### Community 120 - "Community 120"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 121 - "Community 121"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 122 - "Community 122"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 123 - "Community 123"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 124 - "Community 124"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 138 - "Community 138"
Cohesion: 0.40
Nodes (4): Auth, Constants, RevocationReasons, Roles

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 140 - "Community 140"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 141 - "Community 141"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 142 - "Community 142"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 143 - "Community 143"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 153 - "Community 153"
Cohesion: 0.50
Nodes (3): animations, IconComponent(), SlidersHorizontalProps

## Knowledge Gaps
- **176 isolated node(s):** `IsAdmin`, `UserId`, `Username`, `Collection`, `CollectionId` (+171 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1475 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MediaFile` connect `Community 15` to `Community 98`, `Community 67`, `Community 100`, `Community 101`, `Community 2`, `Community 7`, `Community 8`, `Community 11`, `Community 76`, `Community 49`, `Community 84`, `Community 20`, `Community 89`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `IsAdmin`, `UserId`, `Username` to the rest of the system?**
  _176 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01951453114243812 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 9` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 12`, `Community 14`, `Community 16`, `Community 22`, `Community 23`, `Community 37`, `Community 38`, `Community 41`, `Community 46`, `Community 47`, `Community 51`, `Community 52`, `Community 58`, `Community 60`, `Community 79`, `Community 80`, `Community 105`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047280744732974035 - nodes in this community are weakly interconnected._
- **Why does `User` connect `Community 49` to `Community 34`, `Community 67`, `Community 2`, `Community 101`, `Community 102`, `Community 7`, `Community 8`, `Community 11`, `Community 76`, `Community 15`, `Community 84`, `Community 89`, `Community 90`, `Community 93`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04003308519437552 - nodes in this community are weakly interconnected._