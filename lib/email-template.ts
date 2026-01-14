
/**
 * Email Template Parser
 * securely replaces {{placeholders}} with actual data.
 */

interface TemplateData {
    [key: string]: string | undefined;
}

export function parseEmailTemplate(template: string, data: TemplateData): string {
    if (!template) return "";

    // Regex to find {{ variable }} patterns
    // Captures the inner variable name, ignoring whitespace
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        const value = data[key];

        // If data is provided, return it.
        // If not, keep the placeholder or return empty string? 
        // Usually better to keep specific placeholders visible so users notice missing data, 
        // OR replace with empty string. Let's return the value or a fallback.
        return value !== undefined ? value : match;
    });
}

/**
 * Example Usage:
 * const body = "Hello {{candidate_name}}, welcome to {{company_name}}.";
 * const params = { candidate_name: "Alice", company_name: "Acme Corp" };
 * const result = parseEmailTemplate(body, params);
 * // "Hello Alice, welcome to Acme Corp."
 */
