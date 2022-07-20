export type JobDescription = {
  name: string;
  value: string;
};

export type Position = {
  id: string;
  office: string;
  recruitingCategory: string;
  name: string;
  jobDescriptions: JobDescription[];
  employmentType: string;
  seniority: string;
  schedule: string;
  yearsOfExperience: string;
  keywords: string;
  occupation: string;
  occupationCategory: string;
  createdAt: string;
};

export interface GetData {
  (): Promise<Position[]>;
}

export interface SwitchEmptyState {
  (show: boolean): void;
}

export type CategoryWiseData = {
  categoryName: string;
  positions: Omit<Position, "recruitingCategory">[];
};

export interface FormDataFunc {
  (positions: Position[]): CategoryWiseData[];
}

export type State = {
  data: Position[];
  filteredData: Position[];
  filters: {
    department: string | null;
    location: string | null;
  };
  cityMap: {
    [city: string]: {
      img: {
        id: string;
        src: string;
      };
      country: string;
    };
  };
};

export interface HandleFieldFilter {
  (ev: KeyboardEvent): void;
}
