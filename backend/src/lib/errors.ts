import { Prisma } from "@prisma/client";

export function handlePrismaError(error: unknown): { status: number; message: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return {
        status: 400,
        message:
          "Сесія застаріла або некоректне посилання. Вийдіть і увійдіть знову, потім повторіть дію.",
      };
    }
    if (error.code === "P2002") {
      return { status: 409, message: "Запис з такими даними вже існує" };
    }
  }
  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }
  return { status: 500, message: "Внутрішня помилка сервера" };
}
