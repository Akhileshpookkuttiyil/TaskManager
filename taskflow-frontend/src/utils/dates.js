import { format } from "date-fns";

export const parseDateTimeValue = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDateTimeLocalValue = (value) => {
  const date = parseDateTimeValue(value);
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : "";
};

export const toIsoDateTimeString = (value) => {
  const date = parseDateTimeValue(value);
  return date ? date.toISOString() : null;
};

export const formatDateTimeValue = (value, pattern = "MMM d, yyyy h:mm a") => {
  const date = parseDateTimeValue(value);
  return date ? format(date, pattern) : "";
};
