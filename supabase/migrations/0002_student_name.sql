-- 学生の識別方法を「学生ID」から「学生名」に変更する。
-- (面談担当者が一覧画面で「誰の面談か」をすぐに確認できるようにするための変更。
--  学生IDによるプライバシー配慮よりも、社内限定運用における使いやすさを優先する判断。)
alter table students rename column student_code to name;
