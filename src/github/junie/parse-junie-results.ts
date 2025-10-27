import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export interface JunieResults {
    title: string;
    body: string;
}

export async function parseJunieResults(): Promise<JunieResults> {
    const filePath = join(homedir(), '.junie', '.mattehorn', 'out', 'success.md');

    try {
        await access(filePath);
    } catch (error) {
        console.error(`File not found: ${filePath}`);
        throw new Error('Junie results not found');
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let title = '';
    const bodyLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('###')) {
            title = trimmedLine.replace(/^###\s*/, '');
        } else if (trimmedLine.length > 0) {
            bodyLines.push(trimmedLine);
        }
    }

    const body = bodyLines.join('\n');

    return {
        title,
        body
    };
}