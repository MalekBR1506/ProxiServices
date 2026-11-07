-- AlterTable
ALTER TABLE `booking` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectedAt` DATETIME(3) NULL,
    ADD COLUMN `startedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Booking_providerId_startAt_endAt_idx` ON `Booking`(`providerId`, `startAt`, `endAt`);
