namespace Service.Core;

public static class Constants
{
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string User = "User";
    }
    public static class Auth
    {
        public const string SubClaim = "sub";
        public const string UsernameClaim = "username";
        public const string RoleClaim = "role";
        public const string AdminPolicy = "AdminOnly";

        /// <summary>Reasons recorded on refresh-token revocation.</summary>
        public static class RevocationReasons
        {
            public const string Rotated = "rotated";
            public const string Logout = "logout";
            public const string ReuseDetected = "reuse-detected";
            public const string UserDeleted = "user-deleted";
        }
    }
}
