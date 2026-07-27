-- CreateTable
CREATE TABLE "ConfiguracionDescuento" (
    "id" SERIAL NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionDescuento_pkey" PRIMARY KEY ("id")
);
