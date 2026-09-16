-- AIからの「次回への具体的な改善アクション」を保存する列を追加
alter table interview_analyses
  add column if not exists next_action_suggestions jsonb;
