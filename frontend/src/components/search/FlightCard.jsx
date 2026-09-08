import React from 'react';

const FlightCard = ({ vuelo, onSelect }) => {
  if (!vuelo) return null;
  return (
    <div className="border p-4 rounded shadow hover:shadow-md transition">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{vuelo.flight_number}</h3>
          <p>{vuelo.origin} → {vuelo.destination}</p>
          <p className="text-sm text-gray-600">
            {new Date(vuelo.departure_datetime).toLocaleTimeString()} - {new Date(vuelo.arrival_datetime).toLocaleTimeString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">\</p>
          <button onClick={() => onSelect(vuelo)} className="bg-blue-600 text-white px-4 py-2 rounded mt-2">
            Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;