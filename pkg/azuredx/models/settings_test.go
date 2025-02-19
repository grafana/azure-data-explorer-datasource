package models

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

type TestSettingsSuite struct {
	suite.Suite
}

func TestSettings(t *testing.T) {
	suite.Run(t, new(TestSettingsSuite))
}

func (s *TestSettingsSuite) TestFormatTimeout() {
	r := s.Require()
	tests := []struct {
		name     string
		duration time.Duration
		expected string
		err      error
	}{
		{
			name:     "one hour",
			duration: time.Hour,
			expected: "01:00:00",
			err:      nil,
		},
		{
			name:     "less than one minute",
			duration: time.Second * 30,
			expected: "00:00:30",
			err:      nil,
		},
		{
			name:     "more than one minute",
			duration: time.Minute * 2,
			expected: "00:02:00",
			err:      nil,
		},
		{
			name:     "more than one hour",
			duration: time.Hour * 2,
			expected: "",
			err:      fmt.Errorf("timeout must be one hour or less"),
		},
	}
	for _, tt := range tests {
		s.Run(tt.name, func() {
			result, err := formatTimeout(tt.duration)
			r.Equal(tt.expected, result)
			r.Equal(tt.err, err)
		})
	}
}
