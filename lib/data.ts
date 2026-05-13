import { Message } from '@/types/index'
import { sql } from '@/lib/supabase'

export async function fetchMessages() {
    try {
        const data = await sql<Message[]>`SELECT * FROM messages ORDER BY created_at DESC`;
        return data;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch messages.');
    }
}