import { isRouteErrorResponse } from "react-router-dom";

export function getRouteErrorDetails(error: unknown) {
  let title = "Unexpected Error";
  let message = "Something went wrong. Please try again.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || error.data || "The requested page could not be found.";
  } else if (error instanceof Error) {
    if (error.message.includes("Element type is invalid")) {
      title = "Component Error";
      message = "A component failed to load. This may be due to a missing or incorrect import.";
    } else {
      message = error.message;
    }
  }

  return { title, message };
}
