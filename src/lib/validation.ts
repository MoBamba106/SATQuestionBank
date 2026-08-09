import { z } from "zod";

export const sanitizeString = z.string().transform(val => val.replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "").replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gim, "").trim());

export const sanitizeOptionalString = z.string().optional().nullable().transform(val => val ? val.replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "").replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gim, "").trim() : null);
