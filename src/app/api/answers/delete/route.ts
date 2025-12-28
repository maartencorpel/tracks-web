import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with service role key (bypasses RLS)
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * DELETE /api/answers/delete
 * 
 * Server-side API route to delete a player's answer.
 * Uses service role key to bypass RLS policies.
 * 
 * Body: { gamePlayerId: string, questionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const identifier =
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      'unknown';

    if (!rateLimit(identifier)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    if (!supabaseAdmin) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { gamePlayerId, questionId } = body;

    // Validate inputs
    if (!gamePlayerId || typeof gamePlayerId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid gamePlayerId' },
        { status: 400 }
      );
    }

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid questionId' },
        { status: 400 }
      );
    }

    // Delete the answer
    const { data, error } = await supabaseAdmin
      .from('player_question_answers')
      .delete()
      .eq('game_player_id', gamePlayerId)
      .eq('question_id', questionId)
      .select();

    if (error) {
      console.error('Error deleting answer:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Check if any rows were deleted
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No answer found to delete. It may have already been deleted.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: data.length });
  } catch (error) {
    console.error('Exception in delete answer API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

