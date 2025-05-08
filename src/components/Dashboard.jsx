// ✅ STEP 7: src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../firebase';
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import {
  Button, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box, Dialog, DialogContent,
  DialogTitle, FormControlLabel, Checkbox, FormGroup, RadioGroup, Radio
} from '@mui/material';

function Dashboard() {
  const formRef = useRef(null);
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
  const navigate = useNavigate();

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
      }
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !image || !date || !item || !price) {
      return setMessage('Please fill all fields and make sure user is logged in');
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return setMessage('Invalid price');

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

      setMessage('Saved');
      setDate(''); setItem(''); setPrice('');
      setImage(null); setIncome(true);
      setIncomeSource('regular');
      setOutto(true); setOutSource('equipment');
      setShowForm(false);
    } catch (err) {
      setMessage('Error: ' + err.message);
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

  const filtered = expenses.filter(e => {
    if (!startDate || !endDate) return true;
    return e.date >= startDate && e.date <= endDate;
  });

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

  return (
    <Box sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Expense Tracker</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="outlined" onClick={exportExcel}>Export Excel</Button>
        <Button variant="contained" onClick={handleToggleForm}>{showForm ? 'ปิดฟอร์ม' : '+ เพิ่มรายการ'}</Button>
      </Box>

      {/* Summary Section */}
      <Box sx={{ mb: 3, p: 2, background: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6">สรุปข้อมูล</Typography>
        <Typography>💰 รายรับรวม: ฿{totalIncome.toFixed(2)} (รายรับ: ฿{regularIncome.toFixed(2)}, คืนหนี้: ฿{refundIncome.toFixed(2)}, ยืมคนอื่น: ฿{borrowedIncome.toFixed(2)})</Typography>
        <Typography>💸 รายจ่ายรวม: ฿{totalExpense.toFixed(2)} (ซื้อของ: ฿{equipmentExpense.toFixed(2)}, ให้ยืม: ฿{lendExpense.toFixed(2)}, คืนหนี้: ฿{repayExpense.toFixed(2)})</Typography>
        <Typography>💼 คงเหลือสุทธิ: ฿{(totalIncome - totalExpense).toFixed(2)}</Typography>
      </Box>

      {showForm && (
        <Box ref={formRef} component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexDirection: 'column', mb: 2 }}>
          <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} label="Date" InputLabelProps={{ shrink: true }} required />
          <TextField value={item} onChange={(e) => setItem(e.target.value)} label="Description" required />
          <TextField type="number" value={price} onChange={(e) => setPrice(e.target.value)} label="Price" required />
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} required />

          <FormGroup>
            <FormControlLabel control={<Checkbox checked={income} onChange={(e) => setIncome(e.target.checked)} />} label="เงินเข้า" />
          </FormGroup>

          {income ? (
            <RadioGroup row value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
              <FormControlLabel value="regular" control={<Radio />} label="รายรับ" />
              <FormControlLabel value="refund" control={<Radio />} label="คืนเงิน" />
              <FormControlLabel value="borrowed" control={<Radio />} label="ยืมคนอื่น" />
            </RadioGroup>
          ) : (
            <RadioGroup row value={outSource} onChange={(e) => {
              setOutSource(e.target.value);
              setOutto(e.target.value === 'equipment');
            }}>
              <FormControlLabel value="equipment" control={<Radio />} label="ซื้ออุปกรณ์" />
              <FormControlLabel value="lend" control={<Radio />} label="ให้ยืม" />
              <FormControlLabel value="repay" control={<Radio />} label="คืนหนี้" />
            </RadioGroup>
          )}

          <Button type="submit" variant="contained">Save</Button>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
      )}

      {/* Table */}
      <Typography variant="h6">รายการทั้งหมด</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Receipt</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(exp => (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Preview */}
      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)}>
        <DialogTitle>Receipt Preview</DialogTitle>
        <DialogContent>
          <img src={previewImg} alt="preview" style={{ width: '100%', maxWidth: 400 }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
