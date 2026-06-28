-- CreateTable
CREATE TABLE "username_redirects" (
    "id" TEXT NOT NULL,
    "old_username" TEXT NOT NULL,
    "new_username" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "username_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "username_redirects_old_username_key" ON "username_redirects"("old_username");

-- CreateIndex
CREATE INDEX "username_redirects_old_username_idx" ON "username_redirects"("old_username");

-- AddForeignKey
ALTER TABLE "username_redirects" ADD CONSTRAINT "username_redirects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
