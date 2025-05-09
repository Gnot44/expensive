import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../firebase';
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import {
  Box, Typography, Button, TextField, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, DialogTitle,
  FormControlLabel, Checkbox, FormGroup, RadioGroup, Radio, TablePagination,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [date, setDate] = useState('');
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [income, setIncome] = useState(true);
  const [incomeSource, setIncomeSource] = useState('regular');
  const [outto, setOutto] = useState(true);
  const [outSource, setOutSource] = useState('equipment');
  const [message, setMessage] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const unsubSnapshot = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setExpenses(data);
        });
        return () => unsubSnapshot();
      } else {
        navigate('/login');
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !image || !date || !item || !price) {
      return setMessage(t('fill_all_fields'));
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return setMessage(t('invalid_price'));

    try {
      const imageRef = ref(storage, `receipts/${uuidv4()}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, 'expenses'), {
        userId: currentUser.uid,
        date,
        item,
        price: parsedPrice,
        imageUrl,
        income,
        incomeSource: income ? incomeSource : null,
        outto: !income ? outto : null,
        outSource: !income ? outSource : null,
        createdAt: serverTimestamp()
      });

      setMessage(t('saved'));
      setDate(''); setItem(''); setPrice('');
      setImage(null); setIncome(true);
      setIncomeSource('regular'); setOutto(true); setOutSource('equipment');
      setShowForm(false);
    } catch (err) {
      setMessage(t('error') + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
    setTimeout(() => {
      if (!showForm) formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filtered = (expenses || []).filter(e => {
    if (!startDate || !endDate) return true;
    return e.date >= startDate && e.date <= endDate;
  });

  const paginatedData = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Expenses');
    XLSX.writeFile(wb, 'expenses.xlsx');
  };

  const totalIncome = filtered.filter(e => e.income).reduce((sum, e) => sum + e.price, 0);
  const totalExpense = filtered.filter(e => !e.income).reduce((sum, e) => sum + e.price, 0);
  const equipmentExpense = filtered.filter(e => e.outSource === 'equipment').reduce((sum, e) => sum + e.price, 0);
  const lendExpense = filtered.filter(e => e.outSource === 'lend').reduce((sum, e) => sum + e.price, 0);
  const repayExpense = filtered.filter(e => e.outSource === 'repay').reduce((sum, e) => sum + e.price, 0);
  const regularIncome = filtered.filter(e => e.incomeSource === 'regular').reduce((sum, e) => sum + e.price, 0);
  const refundIncome = filtered.filter(e => e.incomeSource === 'refund').reduce((sum, e) => sum + e.price, 0);
  const borrowedIncome = filtered.filter(e => e.incomeSource === 'borrowed').reduce((sum, e) => sum + e.price, 0);
  const payfoodOuter = filtered.filter(e => e.outSource === 'payfood').reduce((sum, e) => sum + e.price, 0);

  return (
    <Box sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>{t('title')}</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" label={t('start_date')} value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label={t('end_date')} value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="outlined" onClick={exportExcel}>{t('export_excel')}</Button>
        <Button variant="contained" onClick={handleToggleForm}>{showForm ? t('close_form') : t('add_entry')}</Button>
      </Box>

      {/* Summary Section */}
      <Box
  sx={(theme) => ({
    mb: 3,
    p: 2,
    borderRadius: 2,
    backgroundColor: theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[100],
  })}
>
        <Typography variant="h6">{t('summary')}</Typography>
        <Typography>💰 {t('total_income')}: ฿{totalIncome.toFixed(2)} ({t('regular')}: ฿{regularIncome.toFixed(2)}, {t('refund')}: ฿{refundIncome.toFixed(2)}, {t('borrowed')}: ฿{borrowedIncome.toFixed(2)})</Typography>
        <Typography>💸 {t('total_expense')}: ฿{totalExpense.toFixed(2)} ({t('equipment')}: ฿{equipmentExpense.toFixed(2)}, {t('food')}: ฿{payfoodOuter.toFixed(2)}, {t('lend')}: ฿{lendExpense.toFixed(2)}, {t('repay')}: ฿{repayExpense.toFixed(2)})</Typography>
        <Typography>💼 {t('net_balance')}: ฿{(totalIncome - totalExpense).toFixed(2)}</Typography>
      </Box>

      {showForm && (
        <Box ref={formRef} component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexDirection: 'column', mb: 2 }}>
          <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} label={t('date')} InputLabelProps={{ shrink: true }} required />
          <TextField value={item} onChange={(e) => setItem(e.target.value)} label={t('description')} required />
          <TextField type="number" value={price} onChange={(e) => setPrice(e.target.value)} label={t('price')} required />
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} required />
          <FormGroup>
            <FormControlLabel control={<Checkbox checked={income} onChange={(e) => setIncome(e.target.checked)} />} label={t('income')} />
          </FormGroup>
          {income ? (
            <RadioGroup row value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
              <FormControlLabel value="regular" control={<Radio />} label={t('regular')} />
              <FormControlLabel value="refund" control={<Radio />} label={t('refund')} />
              <FormControlLabel value="borrowed" control={<Radio />} label={t('borrowed')} />
            </RadioGroup>
          ) : (
            <RadioGroup row value={outSource} onChange={(e) => {
              setOutSource(e.target.value);
              setOutto(e.target.value === 'equipment');
            }}>
              <FormControlLabel value="equipment" control={<Radio />} label={t('equipment')} />
              <FormControlLabel value="payfood" control={<Radio />} label={t('food')} />
              <FormControlLabel value="lend" control={<Radio />} label={t('lend')} />
              <FormControlLabel value="repay" control={<Radio />} label={t('repay')} />
            </RadioGroup>
          )}
          <Button type="submit" variant="contained">{t('save')}</Button>
          <Button variant="outlined" onClick={handleLogout}>{t('logout')}</Button>
        </Box>
      )}

      {/* Table */}
      <Typography variant="h6">{t('all_entries')}</Typography>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('date')}</TableCell>
              <TableCell>{t('description')}</TableCell>
              <TableCell>{t('price')}</TableCell>
              <TableCell>{t('receipt')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map(exp => (
              <TableRow key={exp.id}>
                <TableCell>{exp.date}</TableCell>
                <TableCell>{exp.item}</TableCell>
                <TableCell>{exp.price.toFixed(2)}</TableCell>
                <TableCell>
                  <img
                    src={exp.imageUrl}
                    alt="receipt"
                    style={{ width: '40px', height: '40px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setPreviewImg(exp.imageUrl)}
                  />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} align="center">{t('no_data')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          labelRowsPerPage={t('rows_per_page')}
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Preview */}
      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)}>
        <DialogTitle>{t('preview')}</DialogTitle>
        <DialogContent>
          <img src={previewImg} alt="preview" style={{ width: '100%', maxWidth: 400 }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
