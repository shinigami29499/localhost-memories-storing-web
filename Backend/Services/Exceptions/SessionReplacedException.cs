namespace Services.Exceptions;

public sealed class SessionReplacedException() : UnauthorizedAccessException("Session replaced by a new login.");
