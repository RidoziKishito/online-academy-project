ALTER TABLE courses
ADD COLUMN fts_document tsvector;

CREATE OR REPLACE FUNCTION update_course_fts_document()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts_document :=
    setweight(to_tsvector('simple', remove_accents(NEW.title)), 'A') ||
    setweight(to_tsvector('simple', remove_accents(NEW.short_description)), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_fts_trigger
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_course_fts_document();

CREATE INDEX course_fts_idx ON courses USING GIN (fts_document);