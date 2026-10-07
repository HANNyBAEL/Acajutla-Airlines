import Swal from 'sweetalert2';

export const confirmarAccion = async ({ title, text, confirmText = 'Aceptar', isDanger = false }) => {
  const result = await Swal.fire({
    title: title,
    text: text,
    icon: isDanger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonColor: isDanger ? '#dc2626' : '#2563eb', // red-600 or blue-600
    cancelButtonColor: '#6b7280', // gray-500
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'px-4 py-2 font-semibold',
      cancelButton: 'px-4 py-2 font-medium',
    }
  });
  return result.isConfirmed;
};
