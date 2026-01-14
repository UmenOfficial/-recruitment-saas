-- =====================================================
-- GUEST EVALUATOR MODULE MIGRATION
-- Implements: NDA, Private Notes, Recusal Logic
-- =====================================================

-- 1. Update Evaluation Scores (Detailed Feedback)
alter table evaluation_scores
add column if not exists private_note text, -- Evaluator's personal note (hidden from others? depends on policy, usually visible to master)
add column if not exists recusal_reason text; -- Reason for clicking "Recuse"

-- 2. Update Users (Security Agreement)
-- Guest Evaluators must agree to NDA before accessing data
alter table users
add column if not exists has_agreed_nda boolean default false;

-- 3. Validation Trigger (Optional but recommended)
-- Ensure 'recusal_reason' is provided if 'is_recused' is true
create or replace function check_recusal_reason()
returns trigger as $$
begin
  if NEW.is_recused = true and (NEW.recusal_reason is null or length(trim(NEW.recusal_reason)) = 0) then
    raise exception 'Recusal reason is required when marking as recused';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists ensure_recusal_reason on evaluation_scores;

create trigger ensure_recusal_reason
  before insert or update on evaluation_scores
  for each row execute function check_recusal_reason();
