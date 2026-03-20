import { PrismaClient } from '@prisma/client';

import { createApp } from './app';
import { getConfig } from './config';
import { PrismaEventRepository } from './repositories/prisma-repository';

const config = getConfig();
const prisma = new PrismaClient();
const repository = new PrismaEventRepository(prisma);
const app = createApp(repository);

app.listen(config.API_PORT, () => {
  console.log(`API listening on ${config.API_PORT}`);
});
