import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';
import axios from 'axios';
import logo from '../assets/logo.png'; 

const { Title, Text } = Typography;

function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  
  const sheetBestUrl = import.meta.env.VITE_SHEET_BEST;

  const sheetTabName = "Users"; 

  const completeSheetBestUrl = `${sheetBestUrl}/tabs/${sheetTabName}`;
  
  const onLoginSubmit = async (values) => {
    try {
      setLoading(true);
      
      const response = await axios.get(completeSheetBestUrl);
      
      const usersArray = Array.isArray(response.data) ? response.data : [];
      
      const userWithTC = usersArray.find(u => u.tcKimlik === values.tcKimlik);
      
      if (userWithTC) {
        if (userWithTC.sifre === values.sifre) {
          message.success(`Hoş geldiniz, ${userWithTC.isimSoyisim}!`);
          onLoginSuccess && onLoginSuccess(userWithTC);
        } else {
          form.setFields([
            {
              name: 'sifre',
              errors: ['Şifre yanlış!']
            }
          ]);
        }
      } else {
        message.error('Bu TC Kimlik numarasına ait kullanıcı bulunamadı!');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      message.error('Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const onRegisterSubmit = async (values) => {
    try {
      setLoading(true);
      
      const response = await axios.get(completeSheetBestUrl);
      
      const usersArray = Array.isArray(response.data) ? response.data : [];
      
      const existingUser = usersArray.find(u => u.tcKimlik === values.tcKimlik);
      
      if (existingUser) {
        message.error('Bu TC Kimlik numarası ile kayıtlı bir kullanıcı zaten var!');
        setLoading(false);
        return;
      }
      
      const userId = `USER_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      
      await axios.post(completeSheetBestUrl, {
        userId: userId,
        tcKimlik: values.tcKimlik,
        isimSoyisim: values.isimSoyisim,
        sifre: values.sifre
      });
      
      message.success('Kayıt başarıyla tamamlandı! Giriş yapabilirsiniz.');
      form.resetFields();
      setIsLogin(true);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      console.error('Error details:', {
        message: error.message,
        url: completeSheetBestUrl,
        status: error.response?.status,
        data: error.response?.data
      });
      message.error('Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleForm = () => {
    form.resetFields();
    setIsLogin(!isLogin);
  };
  
  return (
    <div className="container">
      <div className="auth-logo-container">
        <img src={logo} alt="Logo" className="auth-logo" />
      </div>
      <Card 
        className="auth-card" 
        bordered={false} 
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
          {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
        </Title>
        
        <Spin spinning={loading}>
          <Form
            form={form}
            name="auth-form"
            layout="vertical"
            onFinish={isLogin ? onLoginSubmit : onRegisterSubmit}
          >
            <Form.Item
              name="tcKimlik"
              rules={[
                { required: true, message: 'Lütfen TC Kimlik numaranızı girin!' },
                { len: 11, message: 'TC Kimlik numarası 11 haneli olmalıdır!' },
                { pattern: /^[0-9]+$/, message: 'TC Kimlik numarası sadece rakamlardan oluşmalıdır!' }
              ]}
            >
              <Input 
                prefix={<IdcardOutlined />} 
                placeholder="TC Kimlik No" 
                size="large" 
                maxLength={11}
              />
            </Form.Item>
            
            {!isLogin && (
              <Form.Item
                name="isimSoyisim"
                rules={[{ required: true, message: 'Lütfen isim ve soyisminizi girin!' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="İsim Soyisim" 
                  size="large" 
                />
              </Form.Item>
            )}
            
            <Form.Item
              name="sifre"
              rules={[
                { required: true, message: 'Lütfen şifrenizi girin!' },
                { min: 6, message: 'Şifreniz en az 6 karakter olmalıdır!' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Şifre" 
                size="large" 
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block
              >
                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
        
        <div style={{ textAlign: 'center', marginTop: 15 }}>
          <Text>
            {isLogin ? 'Hesabınız yok mu? ' : 'Zaten bir hesabınız var mı? '}
          </Text>
          <Button type="link" onClick={toggleForm} style={{ padding: 0 }}>
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default AuthPage;
