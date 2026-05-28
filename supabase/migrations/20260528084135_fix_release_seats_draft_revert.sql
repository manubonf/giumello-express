-- Quando si liberano posti, se i prenotati scendono sotto min_seats
-- la navetta deve tornare in draft (non restare confirmed).
CREATE OR REPLACE FUNCTION release_seats(p_shuttle_id UUID, p_count INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shuttle       shuttles%ROWTYPE;
  v_new_available INT;
  v_new_booked    INT;
  v_new_status    TEXT;
BEGIN
  SELECT * INTO v_shuttle FROM shuttles WHERE id = p_shuttle_id FOR UPDATE;

  v_new_available := LEAST(v_shuttle.available_seats + p_count, v_shuttle.max_seats);
  v_new_booked    := v_shuttle.max_seats - v_new_available;

  v_new_status := CASE
    WHEN v_shuttle.status IN ('full', 'confirmed') AND v_new_booked < v_shuttle.min_seats THEN 'draft'
    WHEN v_shuttle.status = 'full'                                                         THEN 'confirmed'
    ELSE v_shuttle.status
  END;

  UPDATE shuttles
  SET
    available_seats = v_new_available,
    status          = v_new_status
  WHERE id = p_shuttle_id;
END;
$$;
