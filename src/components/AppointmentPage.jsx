import { useState, useEffect } from 'react';
import { Layout, Typography, Form, Select, Button, DatePicker, Card, message, Spin, Row, Col, Divider, Space, Tag, Modal, Menu } from 'antd';
import { CalendarOutlined, UserOutlined, MedicineBoxOutlined, ClockCircleOutlined, LogoutOutlined, ExclamationCircleOutlined, ScheduleOutlined, UnorderedListOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/tr_TR';
import AppointmentsList from './AppointmentsList';

const { Title, Text } = Typography;
const { Header, Content, Sider } = Layout;
const { Option } = Select;
const { confirm } = Modal;

function AppointmentPage({ user, onLogout }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentView, setCurrentView] = useState('create');
  const [collapsed, setCollapsed] = useState(false);

  const sheetBestUrl = import.meta.env.VITE_SHEET_BEST;

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

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${sheetBestUrl}/tabs/Clinics`);
        if (Array.isArray(response.data)) {
          setClinics(response.data);
        }
      } catch (error) {
        console.error('Klinik verileri çekilemedi:', error);
        message.error('Klinikler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, [sheetBestUrl]);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedClinic) return;

      try {
        setLoading(true);
        const response = await axios.get(`${sheetBestUrl}/tabs/Doctors`);
        if (Array.isArray(response.data)) {
          const filteredDoctors = response.data.filter(
            doctor => doctor.clinicId === selectedClinic
          );
          setDoctors(filteredDoctors);
        }
      } catch (error) {
        console.error('Doktor verileri çekilemedi:', error);
        message.error('Doktorlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (selectedClinic) {
      fetchDoctors();
      form.setFieldValue('doctor', null);
      setSelectedDoctor(null);
    }
  }, [selectedClinic, sheetBestUrl, form]);

  const generateTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      setLoading(true);

      const formattedDate = selectedDate.format('YYYY-MM-DD');
      const response = await axios.get(`${sheetBestUrl}/tabs/Appointments`);

      const allTimeSlots = [];
      for (let hour = 8; hour < 17; hour++) {
        for (let minute of ['00', '15', '30', '45']) {
          const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
          allTimeSlots.push(`${formattedHour}:${minute}`);
        }
      }

      const booked = [];
      if (Array.isArray(response.data)) {
        setAppointments(response.data);
        response.data
          .filter(apt => {
            const normalizedAppointmentDate = normalizeDateFormat(apt.date);
            return apt.doctorId === selectedDoctor && 
                  normalizedAppointmentDate === formattedDate;
          })
          .forEach(apt => {
            booked.push(normalizeTimeFormat(apt.timeSlot));
          });
      }

      setBookedTimes(booked);
      setAvailableTimes(allTimeSlots);
    } catch (error) {
      console.error('Randevu saatleri oluşturulamadı:', error);
      message.error('Müsait saatler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      generateTimeSlots();
      form.setFieldValue('time', null);
    }
  }, [selectedDoctor, selectedDate, sheetBestUrl, form]);

  const handleClinicChange = (value) => {
    setSelectedClinic(value);
  };

  const handleDoctorChange = (value) => {
    setSelectedDoctor(value);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const isTimeSlotBooked = (timeSlot) => {
    const normalizedTimeSlot = normalizeTimeFormat(timeSlot);
    return bookedTimes.some(bookedTime => 
      normalizeTimeFormat(bookedTime) === normalizedTimeSlot
    );
  };

  const verifyTimeSlotAvailability = async (doctorId, date, timeSlot) => {
    try {
      const response = await axios.get(`${sheetBestUrl}/tabs/Appointments`);
      if (Array.isArray(response.data)) {
        const normalizedTimeSlot = normalizeTimeFormat(timeSlot);
        const normalizedDate = normalizeDateFormat(date);
        
        const isBooked = response.data.some(apt => {
          const aptNormalizedDate = normalizeDateFormat(apt.date);
          const aptNormalizedTime = normalizeTimeFormat(apt.timeSlot);
          
          return apt.doctorId === doctorId &&
                aptNormalizedDate === normalizedDate &&
                aptNormalizedTime === normalizedTimeSlot;
        });
        
        return { available: !isBooked, appointments: response.data };
      }
      return { available: false, appointments: [] };
    } catch (error) {
      console.error('Randevu kontrolü hatası:', error);
      return { available: false, appointments: [] };
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);

      const formattedDate = values.date.format('YYYY-MM-DD');
      const formattedTime = normalizeTimeFormat(values.time);

      const verificationResult = await verifyTimeSlotAvailability(
        values.doctor,
        formattedDate,
        formattedTime
      );

      if (!verificationResult.available) {
        message.error('Bu randevu saati şu anda dolu. Lütfen başka bir saat seçin.');

        setAppointments(verificationResult.appointments);
        const updatedBookedTimes = verificationResult.appointments
          .filter(apt => {
            const normalizedAptDate = normalizeDateFormat(apt.date);
            return apt.doctorId === values.doctor && normalizedAptDate === formattedDate;
          })
          .map(apt => normalizeTimeFormat(apt.timeSlot));

        setBookedTimes(updatedBookedTimes);
        setLoading(false);
        return;
      }

      const clinicName = clinics.find(c => c.clinicId === values.clinic)?.clinicName || '';
      const selectedDoctor = doctors.find(d => d.doctorId === values.doctor) || {};
      const doctorName = selectedDoctor.doctorName || '';
      const doctorSpeciality = selectedDoctor.speciality || '';

      const appointmentData = {
        appointmentId: `APT_${Date.now()}`,
        userId: user.userId,
        userName: user.isimSoyisim,
        userTC: user.tcKimlik,
        clinicId: values.clinic,
        clinicName: clinicName,
        doctorId: values.doctor,
        doctorName: doctorName,
        doctorSpeciality: doctorSpeciality,
        date: formattedDate,
        timeSlot: formattedTime,
        status: 'Onaylandı',
        createdAt: new Date().toISOString()
      };

      const finalVerification = await verifyTimeSlotAvailability(
        values.doctor,
        formattedDate,
        formattedTime
      );

      if (!finalVerification.available) {
        message.error('Bu randevu saati başka bir kullanıcı tarafından alındı. Lütfen başka bir saat seçin.');

        setAppointments(finalVerification.appointments);
        const updatedBookedTimes = finalVerification.appointments
          .filter(apt => {
            const normalizedAptDate = normalizeDateFormat(apt.date);
            return apt.doctorId === values.doctor && normalizedAptDate === formattedDate;
          })
          .map(apt => normalizeTimeFormat(apt.timeSlot));

        setBookedTimes(updatedBookedTimes);
        setLoading(false);
        return;
      }

      await axios.post(`${sheetBestUrl}/tabs/Appointments`, appointmentData);

      setAppointments([...finalVerification.appointments, appointmentData]);
      setBookedTimes([...bookedTimes, formattedTime]);

      message.success('Randevunuz başarıyla oluşturuldu!');

      form.resetFields();
      setSelectedClinic(null);
      setSelectedDoctor(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Randevu oluşturma hatası:', error);
      message.error('Randevu oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (value) => {
    if (value) {
      confirm({
        title: 'Randevu Saati Onayı',
        icon: <ExclamationCircleOutlined />,
        content: `${selectedDate?.format('DD.MM.YYYY')} tarihinde saat ${value} için randevu almak istediğinizden emin misiniz?`,
        okText: 'Evet',
        cancelText: 'Hayır',
        onOk() {
          return Promise.resolve();
        },
      });
    }
  };

  const handleMenuClick = (key) => {
    setCurrentView(key);
  };

  const renderContent = () => {
    if (currentView === 'create') {
      return (
        <Card
          className="appointment-card"
          bordered={false}
          title={<Title level={4}>Randevu Oluştur</Title>}
        >
          <Spin spinning={loading}>
            <Form
              form={form}
              name="appointment-form"
              layout="vertical"
              onFinish={onFinish}
            >
              <Form.Item
                name="clinic"
                label="Klinik Seçin"
                rules={[{ required: true, message: 'Lütfen bir klinik seçin!' }]}
              >
                <Select
                  placeholder="Klinik seçin"
                  onChange={handleClinicChange}
                  size="large"
                  suffixIcon={<MedicineBoxOutlined />}
                >
                  {clinics.map(clinic => (
                    <Option key={clinic.clinicId} value={clinic.clinicId}>
                      {clinic.clinicName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="doctor"
                label="Doktor Seçin"
                rules={[{ required: true, message: 'Lütfen bir doktor seçin!' }]}
                disabled={!selectedClinic}
              >
                <Select
                  placeholder={selectedClinic ? "Doktor seçin" : "Önce klinik seçin"}
                  onChange={handleDoctorChange}
                  size="large"
                  disabled={!selectedClinic}
                  suffixIcon={<UserOutlined />}
                >
                  {doctors.map(doctor => (
                    <Option key={doctor.doctorId} value={doctor.doctorId}>
                      {doctor.doctorName}{doctor.speciality ? ` - ${doctor.speciality}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="date"
                    label="Tarih Seçin"
                    rules={[{ required: true, message: 'Lütfen bir tarih seçin!' }]}
                    disabled={!selectedDoctor}
                  >
                    <DatePicker
                      placeholder={selectedDoctor ? "Tarih seçin" : "Önce doktor seçin"}
                      onChange={handleDateChange}
                      size="large"
                      style={{ width: '100%' }}
                      locale={locale}
                      format="DD.MM.YYYY"
                      disabled={!selectedDoctor}
                      disabledDate={(current) => {
                        return current && current < dayjs().startOf('day');
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="time"
                    label="Saat Seçin"
                    rules={[{ required: true, message: 'Lütfen bir saat seçin!' }]}
                    disabled={!selectedDate}
                  >
                    <Select
                      placeholder={selectedDate ? "Saat seçin" : "Önce tarih seçin"}
                      size="large"
                      disabled={!selectedDate}
                      suffixIcon={<ClockCircleOutlined />}
                      onChange={handleTimeSelect}
                    >
                      {availableTimes.map(time => {
                        const isBooked = isTimeSlotBooked(time);
                        return (
                          <Option
                            key={time}
                            value={time}
                            disabled={isBooked}
                            style={isBooked ? { backgroundColor: '#fff1f0' } : {}}
                          >
                            {time} {isBooked && <Tag color="red" style={{ marginLeft: 8 }}>Dolu</Tag>}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  icon={<CalendarOutlined />}
                >
                  Randevuyu Oluştur
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        </Card>
      );
    } else {
      return (
        <Card
          className="appointments-list-card"
          bordered={false}
          title={<Title level={4}>Randevularım</Title>}
        >
          <AppointmentsList user={user} sheetBestUrl={sheetBestUrl} />
        </Card>
      );
    }
  };

  return (
    <Layout className="appointment-layout" style={{ minHeight: '100vh' }}>
      <Header className="appointment-header">
        <div className="header-content">
          <Title level={3} style={{ color: 'white', margin: 0 }}>Randevu Sistemi</Title>
          <Space>
            <div className="user-info">
              <UserOutlined />
              <Text style={{ color: 'white', marginLeft: 8 }}>
                {user?.isimSoyisim || 'Kullanıcı'}
              </Text>
            </div>
            <Button
              type="link"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              style={{ color: 'white' }}
            >
              Çıkış Yap
            </Button>
          </Space>
        </div>
      </Header>

      <Layout>
        <Sider
          width={200}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            background: 'linear-gradient(135deg, #1c2c5b, #2c4277)',
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
            left: 0,
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ 
            padding: '16px 0', 
            textAlign: 'center', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            margin: '0 10px 10px'
          }}>
            <CalendarOutlined style={{ fontSize: '24px', color: '#fff' }} />
            {!collapsed && <div style={{ color: '#fff', marginTop: '8px', fontWeight: 'bold' }}>Menü</div>}
          </div>
          
          <Menu
            mode="inline"
            selectedKeys={[currentView]}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ 
              background: 'transparent', 
              borderRight: 0,
              color: 'rgba(255,255,255,0.8)'
            }}
            theme="dark"
            items={[
              {
                key: 'create',
                icon: <ScheduleOutlined />,
                label: 'Randevu Al',
              },
              {
                key: 'view',
                icon: <UnorderedListOutlined />,
                label: 'Randevularım',
              },
            ]}
          />
        </Sider>

        <Content className="appointment-content" style={{ padding: '24px', minHeight: 280 }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppointmentPage;
