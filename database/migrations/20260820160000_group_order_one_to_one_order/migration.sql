-- GroupOrder <-> Order passa a ser 1:1 (um pedido em grupo tem exatamente
-- um pedido compartilhado por todos os participantes).
CREATE UNIQUE INDEX "orders_group_order_id_key" ON "orders"("group_order_id");
