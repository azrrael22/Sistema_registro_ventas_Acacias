# Sistema_registro_ventas_Acacias
Sistema para registrar las ventas de los productos que la empresa las Acacias permite que los empleados vendan.
Utilizar supabase y vercel.
La idea es que cada empleado pueda ingresar al sistema y registrar las ventas de productos, ya que la empresa permite que los empleados vendan cosas dentro del establecimiento. No todos los empleados venden lo mismo, por ejemplo, el empleado A y el empleado B venden pines (es decir que los dos son socios), el empleado A y el C venden repelentes (son socios), el empleado A, C y D venden camisetas (son socios), pero el empleado A vende alfajores (no tiene socios).
Cada empleado puede registrar una o varias ventas de cualquier producto, sin importar si es socio o no (También se debe permitir las devoluciones).
Es importante que solo el empleado que sea socios (es decir que sean dueños de una mercancía) pueda registrar el retiro del dinero generado por la mercancía. Cuando se haga el retiro del dinero se le debe enviar una notificación (por correo o por la misma app) al otro socio (si es que hay otro socio).
Los empleados podrán seleccionar a que producto o categoría (ya que barios productos pertenecen a una misma categoría) quieren ser socios, y se les debe notificar a los socios que otro socio ingreso.
Se debe tener la posibilidad de generar reportes mensuales, trimestrales, semestrales y anuales, para los socios.
