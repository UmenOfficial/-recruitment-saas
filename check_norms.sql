select * from test_norms where test_id = (select id from tests where title ilike '%NIS%limit 1') limit 20;
