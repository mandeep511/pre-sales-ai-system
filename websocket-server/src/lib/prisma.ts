import bcrypt from "bcrypt";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  password: string;
  active: boolean;
}

const fallbackUser: UserRecord = {
  id: "operator",
  email: "operator@example.com",
  name: "Operator",
  role: "operator",
  password: bcrypt.hashSync("operator123", 10),
  active: true,
};

type FindUniqueArgs = {
  where: {
    email: string;
  };
  select?: Partial<Record<keyof UserRecord, boolean>>;
};

class PrismaFallback {
  user = {
    async findUnique(args: FindUniqueArgs) {
      if (args.where.email !== fallbackUser.email) {
        return null;
      }

      return fallbackUser;
    },
  };
}

export const prisma = new PrismaFallback();
