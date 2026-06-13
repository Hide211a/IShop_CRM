import { Box, CircularProgress, Typography } from "@mui/material";

interface Props {
  label?: string;
}

export function LoadingState({ label = "Завантаження..." }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        gap: 2,
      }}
    >
      <CircularProgress size={36} thickness={4} />
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
    </Box>
  );
}
