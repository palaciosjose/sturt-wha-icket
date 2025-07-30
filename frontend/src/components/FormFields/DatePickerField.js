import React, { useState, useEffect } from 'react';
import { useField } from 'formik';
import Grid from '@material-ui/core/Grid';
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';

export default function DatePickerField(props) {
  const [field, meta, helper] = useField(props);
  const { touched, error } = meta;
  const { setValue } = helper;
  const isError = touched && error && true;
  const { value } = field;
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        } else {
          setSelectedDate(null);
        }
      } catch (error) {
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  function _onChange(date) {
    if (date && !isNaN(date.getTime())) {
      setSelectedDate(date);
      try {
        const ISODateString = date.toISOString();
        setValue(ISODateString);
      } catch (error) {
        setValue(null);
      }
    } else {
      setSelectedDate(null);
      setValue(null);
    }
  }

  return (
    <Grid container>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker
          {...field}
          {...props}
          value={selectedDate}
          onChange={_onChange}
          error={isError}
          invalidDateMessage={isError && error}
          helperText={isError && error}
        />
      </MuiPickersUtilsProvider>
    </Grid>
  );
}
