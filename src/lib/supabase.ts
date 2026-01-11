import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xantgxlazmwmgklwqwrp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbnRneGxhem13bWdrbHdxd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjkzMDUsImV4cCI6MjA4Mzc0NTMwNX0.BAsDEQzxoAja4vC0CkiZCN1p-uC3OShoVD7kIez7tFQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
