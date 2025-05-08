// ✅ STEP 7: src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Dialog,
  DialogContent,
  DialogTitle
} from '@mui/material';

function Dashboard() {
  const [date, setDate] = useState('');
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubSnapshot = () => {};
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        unsubSnapshot = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setExpenses(data);
        });
      }
    });
    return () => {
      unsubAuth();
      unsubSnapshot();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return setMessage('User not authenticated');
    if (!image || !date || !item || !price) return setMessage('Please fill all fields');

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return setMessage('Invalid price');

    try {
      const imageRef = ref(storage, `receipts/${uuidv4()}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      const expenseData = {
        userId: currentUser.uid,
        date: date || '',
        item: item || '',
        price: Number(parsedPrice),
        imageUrl: imageUrl || '',
        createdAt: serverTimestamp()
      };

      console.log('Uploading expense:', expenseData);
      await addDoc(collection(db, 'expenses'), expenseData);

      setMessage('Saved successfully');
      setDate('');
      setItem('');
      setPrice('');
      setImage(null);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const total = expenses.reduce((sum, e) => sum + (e.price || 0), 0);

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Expense Entry</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexDirection: 'column', mb: 2 }}>
        <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} required label="Date" InputLabelProps={{ shrink: true }} />
        <TextField value={item} onChange={(e) => setItem(e.target.value)} label="Item Description" required />
        <TextField type="number" value={price} onChange={(e) => setPrice(e.target.value)} label="Total Price" required />
        <input type="file" onChange={(e) => setImage(e.target.files[0])} accept="image/*" required />
        <Button variant="contained" type="submit">Save</Button>
        <Button variant="outlined" onClick={handleLogout}>Logout</Button>
      </Box>
      {message && <Typography color="error">{message}</Typography>}

      <Typography variant="h6" gutterBottom>Summary</Typography>
      <Typography>Total Expenses: ฿{total.toFixed(2)}</Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Expense List</Typography>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Price (฿)</TableCell>
              <TableCell>Receipt</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date}</TableCell>
                <TableCell>{expense.item}</TableCell>
                <TableCell>{expense.price}</TableCell>
                <TableCell>
                  <img
                    src={expense.imageUrl}
                    alt="receipt"
                    style={{ width: '50px', height: '50px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setPreviewImg(expense.imageUrl)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)}>
        <DialogTitle>Receipt Preview</DialogTitle>
        <DialogContent>
          <img src={previewImg} alt="preview" style={{ width: '100%', maxWidth: '400px' }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
