/**
 File Name : lib/supabase.ts
 Description : supabase 클라이언트 코드
 Author : 임도헌
 
 History
 Date        Author   Status    Description
 2024.12.19  임도헌   Created
 2024.12.19  임도헌   Modified  supabase 클라이언트 코드 분리
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLIC_KEY!);
