select count(*), category from questions where id in (select question_id from test_questions where test_id = (select id from tests where title ilike '%NIS%limit 1')) group by category;
