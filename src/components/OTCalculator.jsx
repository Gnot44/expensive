import React, { useState, useEffect } from 'react';
import {
    Box, TextField, Button, Typography, List, ListItem, Divider, FormControlLabel, Checkbox, IconButton, Grid
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import DeleteIcon from '@mui/icons-material/Delete';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function calculateOT(startTime, endTime, rate, isHoliday) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const start = new Date();
    start.setHours(sh, sm, 0);
    const end = new Date();
    end.setHours(eh, em, 0);

    let hours = (end - start) / (1000 * 60 * 60);
    if (hours < 0) hours += 24;

    let ot1 = 0, ot15 = 0, ot3 = 0;
    if (isHoliday) {
        if (hours <= 8) {
            ot1 = hours;
        } else {
            ot1 = 8;
            ot3 = hours - 8;
        }
    } else {
        ot15 = hours - 8;
    }

    const total = ot1 * rate * 1 + ot15 * rate * 1.5 + ot3 * rate * 3;
    return {
        hours: parseFloat(hours.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        ot1: parseFloat(ot1.toFixed(2)),
        ot15: parseFloat(ot15.toFixed(2)),
        ot3: parseFloat(ot3.toFixed(2))
    };
}

export default function OTCalculator() {
    const { t } = useTranslation();
    const [date, setDate] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [salary, setSalary] = useState(20000);
    const [isHoliday, setIsHoliday] = useState(false);
    const [otList, setOtList] = useState([]);
    const [showForm, setShowForm] = useState(true);
    const [filterStart, setFilterStart] = useState(dayjs().startOf('month'));
    const [filterEnd, setFilterEnd] = useState(dayjs().endOf('month'));

    const rate = isNaN(salary) ? 0 : salary / 30 / 8;

    const fetchOT = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const q = query(collection(db, 'ot_entries'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOtList(data);
    };

    useEffect(() => {
        const savedSalary = localStorage.getItem('monthlySalary');
        if (savedSalary) {
            setSalary(parseFloat(savedSalary));
        }
        fetchOT();
    }, []);

    const handleAdd = async () => {
        const currentUser = auth.currentUser;
        if (!date || !startTime || !endTime || !currentUser) return;

        const startStr = dayjs(startTime).format('HH:mm');
        const endStr = dayjs(endTime).format('HH:mm');
        const result = calculateOT(startStr, endStr, rate, isHoliday);
        const entry = {
            userId: currentUser.uid,
            date: dayjs(date).format('YYYY-MM-DD'),
            startTime: startStr,
            endTime: endStr,
            isHoliday,
            ...result
        };
        const docRef = await addDoc(collection(db, 'ot_entries'), entry);
        setOtList(prev => [...prev, { id: docRef.id, ...entry }]);
        setDate(null);
        setStartTime(null);
        setEndTime(null);
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, 'ot_entries', id));
        setOtList(otList.filter(item => item.id !== id));
    };

    const handleClearFilter = () => {
        setFilterStart(dayjs().startOf('month'));
        setFilterEnd(dayjs().endOf('month'));
    };

    const exportExcel = () => {
        const sheet = XLSX.utils.json_to_sheet(otList.map(({ id, ...entry }) => entry));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet, 'OT');
        XLSX.writeFile(wb, 'ot_data.xlsx');
    };

    const filteredList = otList.filter(item => {
        if (!filterStart || !filterEnd) return true;
        return dayjs(item.date).isAfter(filterStart.subtract(1, 'day')) && dayjs(item.date).isBefore(filterEnd.add(1, 'day'));
    });

    const summary = filteredList.reduce((acc, curr) => {
        acc.total += curr.total;
        acc.ot1 += curr.ot1;
        acc.ot15 += curr.ot15;
        acc.ot3 += curr.ot3;
        return acc;
    }, { total: 0, ot1: 0, ot15: 0, ot3: 0 });
    summary.tot = summary.ot1 + summary.ot15 + summary.ot3;

    return (
        <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
            <Typography variant="h6" gutterBottom>{t('ot_tracker')}</Typography>

            <Button onClick={() => setShowForm(!showForm)} sx={{ mb: 2 }}>
                {showForm ? t('hide_form') : t('show_form')}
            </Button>
            <Button onClick={exportExcel} variant="outlined" sx={{ mb: 2, ml: 1 }}>{t('export_excel')}</Button>

            {showForm && (
                <>
                    <DatePicker
                        label={t('date')}
                        value={date}
                        onChange={(newValue) => setDate(newValue)}
                        slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
                    />
                    <TimePicker
                        label={t('start_time')}
                        value={startTime}
                        onChange={(newValue) => setStartTime(newValue)}
                        ampm={false}
                        minutesStep={15}
                        slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
                    />
                    <TimePicker
                        label={t('end_time')}
                        value={endTime}
                        onChange={(newValue) => setEndTime(newValue)}
                        ampm={false}
                        minutesStep={15}
                        slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
                    />
                    <TextField
                        label={t('monthly_salary')}
                        type="number"
                        value={salary}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setSalary(value);
                            localStorage.setItem('monthlySalary', value);
                        }}
                        fullWidth
                        sx={{ mb: 2 }}
                    />
                    {!isNaN(rate) && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {t('calculated_rate')}: {rate.toFixed(2)} {t('baht_per_hour')}
                        </Typography>
                    )}

                    <FormControlLabel
                        control={<Checkbox checked={isHoliday} onChange={e => setIsHoliday(e.target.checked)} />}
                        label={t('is_holiday')}
                        sx={{ mb: 2 }}
                    />

                    <Button variant="contained" fullWidth onClick={handleAdd}>{t('save')}</Button>
                </>
            )}

            <Box sx={{ mt: 4 }}>
                <Typography variant="h6">{t('filter_by_date')}</Typography>
                <Grid container spacing={2} sx={{ my: 2 }}>
                    <Grid item xs={5}>
                        <DatePicker
                            label={t('start_date')}
                            value={filterStart}
                            onChange={(newValue) => setFilterStart(newValue)}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                    <Grid item xs={5}>
                        <DatePicker
                            label={t('end_date')}
                            value={filterEnd}
                            onChange={(newValue) => setFilterEnd(newValue)}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                    <Grid item xs={2}>
                        <Button variant="outlined" onClick={handleClearFilter}>{t('reset')}</Button>
                    </Grid>
                </Grid>
            </Box>

            <Typography variant="h6" sx={{ mb: 1 }}>{t('ot_summary')}</Typography>
            <Typography sx={{ mb: 2 }}>
                OT x1: {summary.ot1} | OT x1.5: {summary.ot15} | OT x3: {summary.ot3} | TOT: {summary.tot} | 💰 {t('total')}: {summary.total.toFixed(2)} {t('baht')}
            </Typography>

            <Box sx={{ width: '100%', height: { xs: 250, sm: 300 }, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[summary]} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" hide />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ot1" fill="#1976d2" name="OT x1" />
                        <Bar dataKey="ot15" fill="#26a69a" name="OT x1.5" />
                        <Bar dataKey="ot3" fill="#ef5350" name="OT x3" />
                        <Bar dataKey="tot" fill="#ffa726" name="TOT" />
                    </BarChart>
                </ResponsiveContainer>
            </Box>

            <List>
                {filteredList.map((ot) => (
                    <React.Fragment key={ot.id}>
                        <ListItem
                            secondaryAction={
                                <IconButton edge="end" onClick={() => handleDelete(ot.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <Box>
                                <Typography>📅 {ot.date}</Typography>
                                <Typography>🕒 {ot.startTime} - {ot.endTime}</Typography>
                                <Typography>📌 {ot.isHoliday ? t('holiday') : t('working_day')}</Typography>
                                <Typography>⏱️ {t('total_hours')}: {ot.hours} {t('hours')}</Typography>
                                <Typography>➡️ OT x1: {ot.ot1} | OT x1.5: {ot.ot15} | OT x3: {ot.ot3}</Typography>
                                <Typography>💰 {t('total')}: {ot.total} {t('baht')}</Typography>
                            </Box>
                        </ListItem>
                        <Divider />
                    </React.Fragment>
                ))}
                {filteredList.length === 0 && (
                    <Typography sx={{ mt: 2, color: 'gray' }}>{t('no_ot_data')}</Typography>
                )}
            </List>
        </Box>
    );
}
