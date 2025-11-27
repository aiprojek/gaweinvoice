
import type { Client, Product } from '../types';

/**
 * Converts an array of objects to a CSV string.
 * Handles quoting values that contain commas or newlines.
 */
export const arrayToCSV = (data: Record<string, any>[], columns: string[]): string => {
  const header = columns.join(',');
  const rows = data.map(row => {
    return columns.map(fieldName => {
      let value = row[fieldName] || '';
      // Convert numbers to string
      if (typeof value === 'number') value = value.toString();
      // Escape quotes and wrap in quotes if necessary
      if (typeof value === 'string') {
          const needsQuotes = value.includes(',') || value.includes('\n') || value.includes('"');
          if (needsQuotes) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
      }
      return value;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
};

/**
 * Downloads a CSV string as a file.
 * Adds BOM for Excel compatibility.
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parses a CSV string into an array of objects.
 * Simple parser that handles basic quoted fields.
 */
export const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return []; // Header + 1 row minimum

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const obj: Record<string, string> = {};
    const currentLine = lines[i];
    
    // Complex regex to handle commas inside quotes: "Value, with comma", Normal Value
    const values: string[] = [];
    let match;
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    
    while ((match = regex.exec(currentLine)) !== null) {
        // match[1] is quoted value, match[2] is unquoted value
        let val = match[1] ? match[1].replace(/""/g, '"') : match[2];
        if (match.index === regex.lastIndex) regex.lastIndex++; // Avoid infinite loop on empty matches
        if (values.length < headers.length) {
            values.push(val || '');
        }
    }

    // Basic fallback if regex fails or simple split is sufficient (simpler cases)
    // But sticking to the regex result for correctness with quotes
    
    // Map values to headers
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    
    result.push(obj);
  }

  return result;
};

// --- Specific Type Generators ---

export const generateClientsCSV = (clients: Client[]) => {
    const columns = ['name', 'email', 'address', 'phone'];
    return arrayToCSV(clients, columns);
};

export const generateProductsCSV = (products: Product[]) => {
    const columns = ['name', 'description', 'category', 'price', 'cost'];
    return arrayToCSV(products, columns);
};

export const generateTemplateCSV = (type: 'clients' | 'products') => {
    if (type === 'clients') {
        return 'name,email,address,phone\n"John Doe","john@example.com","123 Main St","555-0123"';
    } else {
        return 'name,description,category,price,cost\n"Web Hosting","Basic Plan","Hosting",100,50';
    }
};
