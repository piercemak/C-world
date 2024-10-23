import React, { useEffect, useState } from 'react';
import AxiosInstance from './Axios';
import Dayjs from 'dayjs';
import { useTable } from 'react-table';
import { Box, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import styles from './modules/Table.module.css';

const Table = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AxiosInstance.get('project/')
      .then((res) => {
        setData(res.data);
        setLoading(false);
      });
  }, []);

  const columns = React.useMemo(() => [
    {
      Header: 'Name',
      accessor: 'name', // accessor is the "key" in the data
    },
    {
      Header: 'Status',
      accessor: 'status',
    },
    {
      Header: 'Comments',
      accessor: 'comments',
    },
    {
      Header: 'Start Date',
      accessor: (row) => Dayjs(row.start_date).format('MM-DD-YYYY'),
    },
    {
      Header: 'End Date',
      accessor: (row) => Dayjs(row.end_date).format('MM-DD-YYYY'),
    },
    {
      id: 'actions', // 'id' is required if accessor is not a string
      Header: 'Actions',
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '8px' }}>
          <IconButton color="secondary" component={Link} to={`edit/${row.original.id}`}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" component={Link} to={`delete/${row.original.id}`}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ], []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data });

  if (loading) {
    return <p style={{ textAlign: 'center' }}>Loading data...</p>;
  }

  return (
    <div className={styles.customTable}>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(group => (
            <tr {...group.getHeaderGroupProps()}>
              {group.headers.map(column => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
