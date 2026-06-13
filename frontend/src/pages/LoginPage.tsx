import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import InventoryIcon from "@mui/icons-material/Inventory";
import SpeedIcon from "@mui/icons-material/Speed";
import SecurityIcon from "@mui/icons-material/Security";
import { useAuth } from "../context/AuthContext";

const demoAccounts = [
  { role: "Менеджер", email: "manager@ishop-rivne.ua" },
  { role: "Адмін", email: "admin@ishop-rivne.ua" },
  { role: "Директор", email: "director@ishop-rivne.ua" },
];

const features = [
  { icon: <InventoryIcon />, text: "Облік залишків та IMEI" },
  { icon: <SpeedIcon />, text: "Документи руху в реальному часі" },
  { icon: <SecurityIcon />, text: "Ролі: менеджер, адмін, директор" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [email, setEmail] = useState("manager@ishop-rivne.ua");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Невірний email або пароль");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo123");
    setError("");
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "background.default" }}>
      {isDesktop && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: 6,
            py: 4,
            background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 45%, #312E81 100%)",
            color: "#F8FAFC",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: alpha("#6366F1", 0.25),
              filter: "blur(60px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -60,
              left: -40,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: alpha("#0EA5E9", 0.2),
              filter: "blur(50px)",
            }}
          />

          <Box sx={{ position: "relative", maxWidth: 440 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 32px rgba(79,70,229,0.4)",
                }}
              >
                <SmartphoneIcon sx={{ fontSize: 30, color: "#fff" }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#fff" }}>
                  iShop Рівне
                </Typography>
                <Typography sx={{ color: alpha("#F8FAFC", 0.65) }}>
                  Система управління запасами
                </Typography>
              </Box>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, lineHeight: 1.3 }}>
              Магазин мобільної техніки
            </Typography>
            <Typography sx={{ color: alpha("#F8FAFC", 0.7), mb: 4, lineHeight: 1.7 }}>
              Облік товарів, надходжень, продажів, резервів та IMEI — в одному сучасному інтерфейсі.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {features.map((f) => (
                <Box key={f.text} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha("#FFFFFF", 0.08),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#A5B4FC",
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography sx={{ color: alpha("#F8FAFC", 0.85) }}>{f.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: { xs: 1, md: "0 0 480px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="sm" disableGutters>
          {!isDesktop && (
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1.5,
                }}
              >
                <SmartphoneIcon sx={{ fontSize: 28, color: "#fff" }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                iShop Рівне
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Вхід до системи
              </Typography>
            </Box>
          )}

          <Card sx={{ boxShadow: "0 8px 32px rgba(15,23,42,0.08)" }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              {isDesktop && (
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Вхід
                </Typography>
              )}
              {isDesktop && (
                <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                  Увійдіть до облікового запису
                </Typography>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextField
                  label="Пароль"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 2.5, py: 1.25 }}
                  disabled={loading}
                >
                  {loading ? "Вхід..." : "Увійти"}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Демо-акаунти
                </Typography>
              </Divider>

              <Grid container spacing={1.5}>
                {demoAccounts.map((a) => (
                  <Grid key={a.email} size={{ xs: 12, sm: 4 }}>
                    <Chip
                      label={a.role}
                      onClick={() => fillDemo(a.email)}
                      variant={email === a.email ? "filled" : "outlined"}
                      color={email === a.email ? "primary" : "default"}
                      sx={{
                        width: "100%",
                        height: 36,
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5, textAlign: "center", wordBreak: "break-all" }}
                    >
                      {a.email}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, textAlign: "center" }}>
                Пароль для всіх: demo123
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
}
