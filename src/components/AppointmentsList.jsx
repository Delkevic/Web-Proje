import { useState, useEffect } from 'react';
import { Typography, Spin, Tag, Table, Empty, Button, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;

const normalizeDateFormat = (dateStr) => {
  if (!dateStr) return '';
  
  if (!isNaN(dateStr) && typeof dateStr === 'string') {
    try {
      const excelEpoch = new Date(1899, 11, 30); 
      const parsedDate = new Date(excelEpoch);
      parsedDate.setDate(parsedDate.getDate() + parseInt(dateStr));
      return parsedDate.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error converting date format:', e);
      return dateStr;
    }
  }
  
  try {
    return dayjs(dateStr).format('YYYY-MM-DD');
  } catch (e) {
    return dateStr;
  }
};

const normalizeTimeFormat = (time) => {
  if (!time) return '';
  
  if (!isNaN(time) && (typeof time === 'number' || (typeof time === 'string' && !time.includes(':')))) {
    const decimalTime = parseFloat(time);
    const totalMinutes = Math.round(decimalTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  if (typeof time === 'string' && time.includes(':')) {
    const [hour, minute] = time.split(':');
    const formattedHour = hour.length === 1 ? `0${hour}` : hour;
    const formattedMinute = minute && minute.length === 1 ? `0${minute}` : minute;
    return `${formattedHour}:${formattedMinute || '00'}`;
  }
  
  return time.toString();
};

function AppointmentsList({ user, sheetBestUrl }) {
  const [userAppointments, setUserAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  
  const handleDelete = async (appointmentId) => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${sheetBestUrl}/tabs/Appointments`);
      
      if (Array.isArray(response.data)) {
        const appointmentIndex = response.data.findIndex(apt => apt.appointmentId === appointmentId);
        
        if (appointmentIndex !== -1) {
          await axios.delete(`${sheetBestUrl}/tabs/Appointments/${appointmentIndex}`);
          
          setUserAppointments(prev => prev.filter(apt => apt.appointmentId !== appointmentId));
          message.success('Randevu başarıyla silindi.');
        }
      }
    } catch (error) {
      console.error('Randevu silme hatası:', error);
      message.error('Randevu silinirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const appointmentColumns = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      render: (text) => {
        const normalizedDate = normalizeDateFormat(text);
        try {
          return dayjs(normalizedDate).format('DD.MM.YYYY');
        } catch (e) {
          console.error('Date parsing error:', e);
          return text; 
        }
      }
    },
    {
      title: 'Saat',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      render: (text) => normalizeTimeFormat(text)
    },
    {
      title: 'Klinik',
      dataIndex: 'clinicName',
      key: 'clinicName',
    },
    {
      title: 'Doktor',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (text, record) => {
        let specialty = record.doctorSpeciality;
        
        if (!specialty && record.doctorId) {
          const doctorInfo = doctors.find(doc => doc.doctorId === record.doctorId);
          specialty = doctorInfo?.speciality;
        }
        
        return (
          <span>
            {text}
            {specialty && ` - ${specialty}`}
          </span>
        );
      }
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <Tag color={text === 'Onaylandı' ? 'green' : 'blue'}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Randevuyu sil"
          description="Bu randevuyu silmek istediğinize emin misiniz?"
          okText="Evet"
          cancelText="Hayır"
          onConfirm={() => handleDelete(record.appointmentId)}
        >
          <Button 
            type="primary" 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
          >
            Sil
          </Button>
        </Popconfirm>
      ),
    }
  ];
  
  useEffect(() => {
    fetchUserAppointments();
    fetchDoctors();
  }, [user, sheetBestUrl]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${sheetBestUrl}/tabs/Doctors`);
      if (Array.isArray(response.data)) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Doktorlar yüklenemedi:', error);
    }
  };

  const fetchUserAppointments = async () => {
    if (!user?.userId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${sheetBestUrl}/tabs/Appointments`);
      if (Array.isArray(response.data)) {
        const userAppts = response.data.filter(apt => apt.userId === user.userId);
        if (userAppts.length > 0) {
          console.log('First appointment:', userAppts[0]);
        }
        userAppts.sort((a, b) => {
          const dateStrA = normalizeDateFormat(a.date);
          const dateStrB = normalizeDateFormat(b.date);
          
          const timeStrA = normalizeTimeFormat(a.timeSlot);
          const timeStrB = normalizeTimeFormat(b.timeSlot);
          
          const dateA = new Date(`${dateStrA}T${timeStrA}`);
          const dateB = new Date(`${dateStrB}T${timeStrB}`);
          return dateB - dateA;
        });
        setUserAppointments(userAppts);
      }
    } catch (error) {
      console.error('Randevular yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Spin spinning={loading}>
      <h2 style={{margin:"auto"}}>Randevularım</h2>
      {userAppointments.length > 0 ? (
        <Table
          columns={appointmentColumns}
          dataSource={userAppointments}
          rowKey="appointmentId"
          pagination={{ pageSize: 5 }}
        />
      ) : (
        <Empty
          description="Henüz randevunuz bulunmamaktadır"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Spin>
  );
}

export default AppointmentsList;
